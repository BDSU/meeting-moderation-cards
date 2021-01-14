import * as dotenv from "dotenv";
import * as express from "express";
import * as http from "http";
import * as handlebars from "express-handlebars";
import * as popsicle from "popsicle";
import * as ClientOAuth2 from "client-oauth2";
import * as path from "path";
import * as morgan from "morgan";
import * as session from "express-session";
import * as bodyParser from "body-parser";
import * as websocket from "websocket";
import * as crypto from "crypto";
import * as QRCode from "qrcode";

dotenv.config();

if (!process.env.PORT) throw new Error('PORT Config Variable unset!. Please set in the .env-File');
if (!process.env.BASE_URL) throw new Error("BASE_URL config variable unset!. Please set in the .env-File");

let app = express();
let server = new http.Server(app);

app.use(morgan("common"));

let sessionParser = session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
});

app.use(sessionParser);

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

function checkAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.body.name && !oauthEnabled) {
    req.session.name = req.body.name;
    req.session.uid = generateId();
  }

  if (!req.session.name) {
    req.session.redirectUri = req.originalUrl;
    res.redirect("/");
  } else {
    next();
  }
}

if (!oauthEnabled) {
  app.get("/", function (req: express.Request, res: express.Response) {
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
    redirectUri: `${process.env.BASE_URL}/oauth/callback`,
  });

  app.get("/", (req: express.Request, res: express.Response) => {
    const uri = oauthClient.code.getUri();
    res.redirect(uri);
  });

  app.get("/oauth/callback", async (req: express.Request, res: express.Response) => {
    try {
      const user = await oauthClient.code.getToken(req.originalUrl);
      const requestOptions = user.sign({
        url: process.env.OAUTH_USER_ENDPOINT,
      });

      const response = await popsicle.request(requestOptions).use(popsicle.plugins.parse('json'));
      const userData = response.body;
      const hash = crypto.createHash('sha256');

      req.session.name = process.env.OAUTH_USER_NAME_PATH.split("|")
        .map(path => getPropertyByPath(userData, path))
        .join(" ")
        .trim();

      req.session.uid = hash.update(
        process.env.OAUTH_USER_ID_PATH.split("|")
          .map(path => getPropertyByPath(userData, path))
          .join("_")
          .trim()
      ).digest('hex');

      return res.redirect(req.session.redirectUri || "/stimmung");
    } catch (exception) {
      // TODO: do actual error handling
      return res.redirect("/");
    }

  });
}

app.get("/qr/:type/:room?", async (req: express.Request, res: express.Response) => {
  const options: QRCode.QRCodeToBufferOptions = {
    width: 300,
    color: {
      dark: process.env.QR_COLOR_DARK || "000000ff",
      light: process.env.QR_COLOR_LIGHT || "ffffffff"
    }
  }

  let path: string;
  if (req.params.type === "join") {
    path = 'stimmung';
  } else {
    res.sendStatus(400);
    return;
  }

  res.set('Content-Type', 'image/png');
  res.send(await QRCode.toBuffer(`${process.env.BASE_URL}/${path}/${req.params.room || ''}`, options));
});

app.all("/stimmung/:room?", checkAuth, function (req: express.Request, res: express.Response) {
  res.render("stimmung", {
    html_title: process.env.HTML_TITLE || "Stimmungskarten",
    html_description: process.env.HTML_DESCRIPTION,
    html_author: process.env.HTML_AUTHOR,
    name: req.session.name,
    uid: req.session.uid || '',
    room: req.params.room || '',
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
});

let wss = new websocket.server({
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

let rooms: Room[] = [];
wss.on("request", async function (request) {
  let name: string, id: string;
  try {
    let expressReq = request.httpRequest as express.Request;
    ({name, id} = await new Promise((resolve, reject) => {
      sessionParser(expressReq, {} as express.Response, () => {
        if (expressReq.session && expressReq.session.name && expressReq.session.uid) {
          resolve({name: expressReq.session.name as string, id: expressReq.session.uid as string});
        } else {
          reject("session, name or id not set");
        }
      })
    }));
  } catch (e) {
    console.error("could not retrieve user name or id from session! Rejecting request...", request);
    request.reject(403);
    return;
  }
  let connection = request.accept("stimmung", request.origin);
  const roomId = request.resourceURL.path.substr(1);
  if (!rooms[roomId]) {
    rooms[roomId] = {
      connections: [],
      cards: [],
    };
  }
  const room: Room = rooms[roomId];

  connection.on("message", function (message) {
    let data = JSON.parse(message.utf8Data);
    // console.log(`Inbound: ${message.utf8Data}`);
    let card: Card;
    let msg: string;

    switch (data.type) {
      case "join":
        room.connections.push({name, connection, id});
        msg = JSON.stringify({
          type: "connected",
          connected: room.connections.reduce((rv, cv) => {
            if (!rv.find((item) => item.id == cv.id)) {
              rv.push({name: cv.name, id: cv.id});
            }
            return rv;
          }, []).map((item) => {
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
        msg = '{"type": "msg", "name": "' + name + '", "msg":"' + data.msg + '"}';
        break;
      case "raise":
        if (!room.cards.find((item) => item.card === data.card && item.id === id)) {
          card = {
            type: data.type,
            card: data.card,
            id,
            name,
          };
          msg = JSON.stringify(card);
          room.cards.push(card);
        }
        break;
      case "lower":
        if (room.cards.find((item) => item.card === data.card && item.id === id)) {
          card = {
            type: data.type,
            card: data.card,
            id,
            name,
          };
          msg = JSON.stringify(card);
          room.cards = room.cards.filter(
              (item) => !(item.id === id && item.card === data.card)
          );
        }
        break;
      case "reset":
        room.cards = [];
        msg = JSON.stringify({ type: "reset" });
        break;
      case "kick":
        room.connections.filter((conn) => conn.id == data.id)
          .map((conn) => conn.connection.close());
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
    room.connections = room.connections.filter(
      (item) => item.connection != connection
    );
    if (!room.connections.find((item) => item.id == id)) {
      room.cards = room.cards.filter((item) => item.id !== id);
    }

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
            connected: room.connections.reduce((rv, cv) => {
              if (!rv.find((item) => item.id == cv.id)) {
                rv.push({name: cv.name, id: cv.id});
              }
              return rv;
            }, []).map((item) => {
              return { name: item.name, id: item.id };
            }),
          })
        );
      }
    });
  });
});

let ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

let ID_LENGTH = 8;

let generateId = function () {
  let rtn = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return rtn;
};
