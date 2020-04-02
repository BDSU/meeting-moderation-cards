var PORT = 8080;
var express = require("express");
var http = require("http");
var handlebars = require("express-handlebars");

var app = express();
var server = http.Server(app);

var path = require("path");

var cookieSession = require("cookie-session");
var bodyParser = require("body-parser");
app.use(
  cookieSession({
    name: "session",
    keys: ["key1", "key2"]
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));

app.set("views", path.join(__dirname, "html"));
//app.set("view engine", "jade");
app.set("view engine", "hbs");
app.engine(
  "hbs",
  handlebars({
    extname: "hbs",
    defaultLayout: false,
  })
);

function checkAuth(req, res, next) {
  if (!req.session.name) {
    res.redirect("/");
  } else {
    next();
  }
}

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "html", "join.html"));
});

app.post("/login", function(req, res) {
  var name = req.body.name;
  console.log(req.body);

  if (name === "u1" || name === "u2") {
    req.session.name = name;
  }

  res.redirect("/stimmung");
});

app.get("/stimmung", checkAuth, function(req, res) {
  res.render("stimmung", { name: req.session.name });
});

app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "stimmung.html"));
});

app.get("/logout", function(req, res) {
  connections[req.session.name].close();
  delete connections[req.session.name];

  delete req.session.name;

  var msg =
    '{"type": "join", "names": ["' +
    Object.keys(connections).join('","') +
    '"]}';

  for (var key in connections) {
    if (connections[key] && connections[key].send) {
      connections[key].send(msg);
    }
  }
  res.redirect("/");
});

server.listen(8080);

var WSS = require("websocket").server; //,http = require('http');

//var server = http.createServer();
//server.listen(8181);

var wss = new WSS({
  httpServer: server,
  autoAcceptConnections: false
});

var connections = {};
var cards = [];
wss.on("request", function(request) {
  var connection = request.accept("stimmung", request.origin);

  connection.on("message", function(message) {
    var name = "";

    for (var key in connections) {
      if (connection === connections[key]) {
        name = key;
      }
    }

    var data = JSON.parse(message.utf8Data);
    console.log(`Inbound: ${message.utf8Data}`);

    switch (data.type) {
      case "join":
        connections[data.name] = connection;
        //console.log(request.cookies.filter(cookie => cookie.name === 'session'));
        var msg =
          '{"type": "join", "names": ["' +
          Object.keys(connections).join('","') +
          '"]}';
        connection.send(
          JSON.stringify({
            type: "all",
            cards
          })
        );
        break;
      case "msg":
        var msg =
          '{"type": "msg", "name": "' + name + '", "msg":"' + data.msg + '"}';
        break;
      case "raise":
        var msg = JSON.stringify({
          type: data.type,
          card: data.card,
          name
        });
        cards.push({ name, card: data.card });
        break;
      case "lower":
        var msg = JSON.stringify({
          type: data.type,
          card: data.card,
          name: name
        });
        cards = cards.filter(
          item => !(item.name === name && item.card === data.card)
        );
        break;
    }

    console.log(cards);

    for (var key in connections) {
      if (connections[key] && connections[key].send) {
        connections[key].send(msg);
      }
    }
  });

  connection.on("close", function(message) {
    var name = "";

    for (var key in connections) {
      if (connection === connections[key]) {
        name = key;
      }
    }

    console.log(`Closing connection for ${name}`);

    cards = cards.filter(item => item.name !== name);

    for (var key in connections) {
      if (connections[key] && connections[key].send) {
        connections[key].send(
          JSON.stringify({
            type: "all",
            cards
          })
        );
      }
    }
  });
});
//server.listen(PORT);
