$(document).ready(() => {
  let wsUrl =
    (location.protocol == "https:" ? "wss://" : "ws://") +
    location.hostname +
    (location.port ? ":" + location.port : "");
  var socket = new WebSocket(wsUrl, "stimmung"); // "ws://localhost:8080/"
  socket.onopen = function () {
    socket.send(
      JSON.stringify({
        type: "join",
        name: $("#displayname").text(),
      })
    );
  };
  socket.onmessage = function (msg) {
    var data = JSON.parse(msg.data);
    switch (data.type) {
      case "msg":
        var msg = $("<div>" + data.name + ": " + data.msg + "</div>");
        $("#cards").append(msg);
        break;
      case "join":
        $("#users").empty();
        for (var i = 0; i < data.names.length; i++) {
          var user = $("<div>" + data.names[i] + "</div>");
          $("#users").append(user);
        }
        break;
      case "raise":
        renderCard(data);
        countCards();
        break;
      case "lower":
        $(`#${data.id}${data.card}`).remove();
        countCards();
        break;
      case "all":
        $("#cards").empty();
        data.cards.forEach((card) => {
          renderCard(card);
        });
        countCards();
        break;
      case "reset":
        $("#cards").empty();
        resetOwnCards();
        countCards();
        break;
      default:
        $("#cards").append(msg.data);
    }
  };

  socket.onclose = function (msg) {
    $("#counts").empty();
    $("#cards").empty();
    $("#cards").append(
      '<div>Disconnected! Go back to <a href="/">join screen</a></div>'
    );
  };

  function renderCard(data) {
    let card = `<div id="${data.id}${data.card}" class="card-common card-${data.card}">${data.name}</div>`;
    $("#cards").append(card);
  }

  function countCards() {
    ["yellow", "blue", "green", "red", "white", "all"].forEach((color) => {
      $(`#count-${color}`).text($(`#cards .card-${color}`).length);
    });
  }

  var yellow = false;
  var blue = false;
  var green = false;
  var red = false;
  var white = false;
  var all = false;

  function resetOwnCards() {
    ["yellow", "blue", "green", "red", "white", "all"].forEach((color) => {
      $(`#${color}Btn`).addClass("btn-color-unselected");
      $(`#${color}Btn`).removeClass("btn-color-selected");
    });
    yellow = false;
    blue = false;
    green = false;
    red = false;
    white = false;
    all = false;
  }

  $("#yellowBtn").on("click", function (event) {
    event.preventDefault();
    socket.send(
      JSON.stringify({
        type: yellow ? "lower" : "raise",
        card: "yellow",
      })
    );
    yellow = !yellow;
    $(this).toggleClass("btn-color-unselected");
    $(this).toggleClass("btn-color-selected");
  });
  $("#blueBtn").on("click", function (event) {
    event.preventDefault();
    socket.send(
      JSON.stringify({
        type: blue ? "lower" : "raise",
        card: "blue",
      })
    );
    blue = !blue;
    $(this).toggleClass("btn-color-unselected");
    $(this).toggleClass("btn-color-selected");
  });
  $("#greenBtn").on("click", function (event) {
    event.preventDefault();
    socket.send(
      JSON.stringify({
        type: green ? "lower" : "raise",
        card: "green",
      })
    );
    green = !green;
    $(this).toggleClass("btn-color-unselected");
    $(this).toggleClass("btn-color-selected");
  });
  $("#redBtn").on("click", function (event) {
    event.preventDefault();
    socket.send(
      JSON.stringify({
        type: red ? "lower" : "raise",
        card: "red",
      })
    );
    red = !red;
    $(this).toggleClass("btn-color-unselected");
    $(this).toggleClass("btn-color-selected");
  });
  $("#whiteBtn").on("click", function (event) {
    event.preventDefault();
    socket.send(
      JSON.stringify({
        type: white ? "lower" : "raise",
        card: "white",
      })
    );
    white = !white;
    $(this).toggleClass("btn-color-unselected");
    $(this).toggleClass("btn-color-selected");
  });
  $("#allBtn").on("click", function (event) {
    event.preventDefault();
    socket.send(
      JSON.stringify({
        type: all ? "lower" : "raise",
        card: "all",
      })
    );
    all = !all;
    $(this).toggleClass("btn-color-unselected");
    $(this).toggleClass("btn-color-selected");
  });
  $("#resetBtn").on("click", function (event) {
    event.preventDefault();
    socket.send(
      JSON.stringify({
        type: "reset",
      })
    );
    $("#cards").empty();
    resetOwnCards();
    countCards();
  });

  document.body.addEventListener("keypress", (event) => {
    if (event.key && event.key === "R") {
      $('#resetRow').toggleClass('reset-show');
      $('#resetRow').toggleClass('reset-hide');
    }
  });
});
