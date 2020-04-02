var PORT = 8080;
var express = require("express");

var app = express();

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

app.set("views", __dirname + "/app/views");
app.set("view engine", "jade");

function checkAuth(req, res, next) {
  if (!req.session.user) {
    res.redirect("/");
  } else {
    next();
  }
}

app.get("/", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  var user = req.body.username,
    pw = req.body.password;

  if (user === "u1" && pw === "test") {
    req.session.user = "u1";
  } else if (user === "u2" && pw === "test") {
    req.session.user = "u2";
  }

  res.redirect("/chat");
});

app.get("/chat", checkAuth, function(req, res) {
  res.render("chat", { user: req.session.user });
});

app.get("/logout", function(req, res) {
  connections[req.session.user].close();
  delete connections[req.session.user];

  delete req.session.user;

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

app.listen(8080);

var WSS = require('websocket').server,
    http = require('http');

var server = http.createServer();
server.listen(8181);

var wss = new WSS({
    httpServer: server,
    autoAcceptConnections: false
});

var connections = {};
var cards = [];
wss.on("request", function(request) {
  var connection = request.accept("chat", request.origin);

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
