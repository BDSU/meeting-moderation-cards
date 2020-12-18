import dotenv from "dotenv";
import express, {Request, Response, NextFunction} from "express";
import http from "http";
import handlebars from "express-handlebars";
import * as popsicle from "popsicle";
import ClientOAuth2 from "client-oauth2";
import path from "path";
import morgan from "morgan";
import session from "express-session";
import bodyParser from "body-parser";
import websocket from "websocket";

dotenv.config();
var app = express();
var server = new http.Server(app);

app.use(morgan("common"));

app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));

app.set("views", path.join(__dirname, "html"));
app.set("view engine", "hbs");
app.engine(
  "hbs",
  handlebars({
    extname: "hbs",
    defaultLayout: "",
  })
);

function getPropertyByPath(obj: object, path: string) {
  return path.split('.').reduce((data, key) => {
    if (key in data) {
      return data[key];
    }

    return undefined;
  }, obj);
}

const oauthEnabled = !!process.env.OAUTH_CLIENT_ID;

function checkAuth(req: Request, res: Response, next: NextFunction) {
  if (req.body.name && !oauthEnabled) {
    req.session.name = req.body.name;
  }

  if (!req.session.name) {
    req.session.redirectUri = req.originalUrl;
    res.redirect("/");
  } else {
    next();
  }
}

if (!oauthEnabled) {
  app.get("/", function (req: Request, res: Response) {
    res.render("join", {
      html_title: process.env.HTML_TITLE
      ? process.env.HTML_TITLE
      : "Stimmungskarten",
      html_description: process.env.HTML_DESCRIPTION
      ? process.env.HTML_DESCRIPTION
      : "",
      html_author: process.env.HTML_AUTHOR ? process.env.HTML_AUTHOR : "",
      name_pattern: process.env.NAME_PATTERN ? process.env.NAME_PATTERN : ".*",
      name: req.session.name,
      action: req.session.redirectUri || '/stimmung',
    });
  });
} else {
  const oauthClient = new ClientOAuth2({
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    scopes: process.env.OAUTH_SCOPES.split(" "),
    authorizationUri: process.env.OAUTH_AUTHORIZATION_URI,
    accessTokenUri: process.env.OAUTH_ACCESSTOKEN_URI,
    redirectUri: `${process.env.OAUTH_REDIRECT_BASE}/oauth/callback`,
  });

  app.get("/", (req: Request, res: Response) => {
    const uri = oauthClient.code.getUri();
    res.redirect(uri);
  });

  app.get("/oauth/callback", async (req: Request, res: Response) => {
    try {
      const user = await oauthClient.code.getToken(req.originalUrl);
      const requestOptions = user.sign({
        url: process.env.OAUTH_USER_ENDPOINT,
      });

      const response = await popsicle.request(requestOptions).use(popsicle.plugins.parse('json'));
      const userData = response.body;

      req.session.name = process.env.OAUTH_USER_NAME_PATH.split("|")
        .map(path => getPropertyByPath(userData, path))
        .join(" ")
        .trim();

      return res.redirect(req.session.redirectUri || "/stimmung");
    } catch (exception) {
      // TODO: do actual error handling
      return res.redirect("/");
    }

  });
}

app.all("/stimmung/:room?", checkAuth, function (req: Request, res: Response) {
  res.render("stimmung", {
    html_title: process.env.HTML_TITLE
      ? process.env.HTML_TITLE
      : "Stimmungskarten",
    html_description: process.env.HTML_DESCRIPTION
      ? process.env.HTML_DESCRIPTION
      : "",
    html_author: process.env.HTML_AUTHOR ? process.env.HTML_AUTHOR : "",
    name: req.session.name,
    room: req.params.room || '',
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
});

var wss = new websocket.server({
  httpServer: server,
  autoAcceptConnections: false,
});

interface Room {
  connections: Connection[];
  cards: Card[];
}

interface Connection {
  name: string;
  connection: websocket.connection;
  id: string;
}

interface Card {
  type: any;
  card: any;
  id: string;
  name: string;
}

var rooms: Room[] = [];
wss.on("request", function (request) {
  var connection = request.accept("stimmung", request.origin);
  const roomId = request.resourceURL.path.substr(1);
  if (!rooms[roomId]) {
    rooms[roomId] = {
      connections: [],
      cards: [],
    };
  }
  const room = rooms[roomId];

  connection.on("message", function (message) {
    var name = "";
    var id = "";

    room.connections
      .filter((item) => item.connection == connection)
      .map((item) => {
        name = item.name;
        id = item.id;
      });

    var data = JSON.parse(message.utf8Data);
    // console.log(`Inbound: ${message.utf8Data}`);
    let card: Card = undefined;

    switch (data.type) {
      case "join":
        do {
          id = generateId();
        } while (room.connections.filter((item) => item.id == id).length > 0);

        room.connections.push({ name: data.name, connection: connection, id: id });
        var msg = JSON.stringify({
          type: "connected",
          connected: room.connections.map((item) => {
            return { name: item.name, id: item.id };
          }),
        });
        connection.send(
          JSON.stringify({
            type: "all",
            cards: room.cards,
          })
        );
        break;
      case "msg":
        var msg =
          '{"type": "msg", "name": "' + name + '", "msg":"' + data.msg + '"}';
        break;
      case "raise":
        card = {
          type: data.type,
          card: data.card,
          id,
          name,
        };
        var msg = JSON.stringify(card);
        room.cards.push(card);
        break;
      case "lower":
        card = {
          type: data.type,
          card: data.card,
          id,
          name,
        };
        var msg = JSON.stringify(card);
        room.cards = room.cards.filter(
          (item) => !(item.id === id && item.card === data.card)
        );
        break;
      case "reset":
        room.cards = [];
        var msg = JSON.stringify({ type: "reset" });
        break;
      case "kick":
        let kickconnection = room.connections.filter((conn) => conn.id == data.id)[0]
          .connection;
        kickconnection.close();
        break;
    }

    // console.log(room.cards);
    // console.log(`Outbound: ${msg}`);
    if (msg) {
      room.connections.map((item) => {
        if (item.connection && item.connection.send) {
          item.connection.send(msg);
        }
      });
    }
  });

  connection.on("close", function (message) {
    var name = "";
    var id = "";

    room.connections
      .filter((item) => item.connection == connection)
      .map((item) => {
        name = item.name;
        id = item.id;
      });

    room.connections = room.connections.filter(
      (item) => item.connection != connection && item.id != id
    );
    room.cards = room.cards.filter((item) => item.name !== name);

    room.connections.map((item) => {
      if (item.connection && item.connection.send) {
        item.connection.send(
          JSON.stringify({
            type: "all",
            cards: room.cards,
          })
        );
        item.connection.send(
          JSON.stringify({
            type: "connected",
            connected: room.connections.map((item) => {
              return { name: item.name, id: item.id };
            }),
          })
        );
      }
    });
  });
});

var ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

var ID_LENGTH = 8;

var generateId = function () {
  var rtn = "";
  for (var i = 0; i < ID_LENGTH; i++) {
    rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return rtn;
};
