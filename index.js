require("dotenv").config();
var express = require("express");
var http = require("http");
var handlebars = require("express-handlebars");

var app = express();
var server = http.Server(app);

var path = require("path");

var morgan = require("morgan");
app.use(morgan("common"));

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));

app.set("views", path.join(__dirname, "html"));
app.set("view engine", "hbs");
app.engine(
  "hbs",
  handlebars({
    extname: "hbs",
    defaultLayout: false,
  })
);

function checkAuth(req, res, next) {
  if (!req.body.name) {
    res.redirect("/");
  } else {
    next();
  }
}

app.get("/", function (req, res) {
  res.render("join", {
    html_title: process.env.HTML_TITLE
      ? process.env.HTML_TITLE
      : "Stimmungskarten",
    html_description: process.env.HTML_DESCRIPTION
      ? process.env.HTML_DESCRIPTION
      : "",
    html_author: process.env.HTML_AUTHOR ? process.env.HTML_AUTHOR : "",
    name_pattern: process.env.NAME_PATTERN ? process.env.NAME_PATTERN : ".*",
  });
});

app.post("/stimmung", checkAuth, function (req, res) {
  res.render("stimmung", {
    html_title: process.env.HTML_TITLE
      ? process.env.HTML_TITLE
      : "Stimmungskarten",
    html_description: process.env.HTML_DESCRIPTION
      ? process.env.HTML_DESCRIPTION
      : "",
    html_author: process.env.HTML_AUTHOR ? process.env.HTML_AUTHOR : "",
    name: req.body.name,
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
});

var WSS = require("websocket").server;

var wss = new WSS({
  httpServer: server,
  autoAcceptConnections: false,
});

var connections = []; // {name, connection}
var cards = [];
wss.on("request", function (request) {
  var connection = request.accept("stimmung", request.origin);

  connection.on("message", function (message) {
    var name = "";
    var id = "";

    connections
      .filter((item) => item.connection == connection)
      .map((item) => {
        name = item.name;
        id = item.id;
      });

    var data = JSON.parse(message.utf8Data);
    // console.log(`Inbound: ${message.utf8Data}`);
    let card = undefined;

    switch (data.type) {
      case "join":
        do {
          id = generateId();
        } while (connections.filter((item) => item.id == id).length > 0);

        connections.push({ name: data.name, connection, id });

        var msg =
          '{"type": "join", "names": ["' +
          connections.map((item) => item.name).join('","') +
          '"]}';
        connection.send(
          JSON.stringify({
            type: "all",
            cards,
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
        cards.push(card);
        break;
      case "lower":
        card = {
          type: data.type,
          card: data.card,
          id,
          name,
        };
        var msg = JSON.stringify(card);
        cards = cards.filter(
          (item) => !(item.id === id && item.card === data.card)
        );
        break;
      case "reset":
        cards = [];
        var msg = JSON.stringify({ type: "reset" });
    }

    // console.log(cards);
    // console.log(`Outbound: ${msg}`);

    connections.map((item) => {
      if (item.connection && item.connection.send) {
        item.connection.send(msg);
      }
    });
  });

  connection.on("close", function (message) {
    var name = "";
    connections
      .filter((item) => item.connection == connection)
      .map((item) => (name = item.name));

    cards = cards.filter((item) => item.name !== name);

    connections.map((item) => {
      if (item.connection && item.connection.send) {
        item.connection.send(
          JSON.stringify({
            type: "all",
            cards,
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
