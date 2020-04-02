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

module.exports = app;