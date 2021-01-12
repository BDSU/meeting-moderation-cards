var ownColors = {
  yellow: false,
  blue: false,
  green: false,
  red: false,
  white: false,
  all: false,
};

$(document).ready(() => {
  let wsUrl =
    (location.protocol == "https:" ? "wss://" : "ws://") +
    location.hostname +
    (location.port ? ":" + location.port : "") +
    '/' + roomId;
  let socket = new WebSocket(wsUrl, "stimmung"); // "ws://localhost:8080/"
  socket.onopen = function () {
    socket.send(
      JSON.stringify({
        type: "join",
        name: $("#displayname").text(),
      })
    );
  };
  socket.onmessage = function (msgEvt) {
    let data = JSON.parse(msgEvt.data);
    switch (data.type) {
      case "msg":
        let msg = $("<div>" + data.name + ": " + data.msg + "</div>");
        $("#cards").append(msg);
        break;
      case "join":
        $("#users").empty();
        for (let i = 0; i < data.names.length; i++) {
          let user = $("<div>" + data.names[i] + "</div>");
          $("#users").append(user);
        }
        break;
      case "raise":
      case "lower":
        renderCard(data);
        countCards();
        renderIfUserHasRaised(data.id);
        break;
      case "all":
        $("#cards").empty();
        data.cards.forEach((card) => {
          renderCard(card);
        });
        countCards();
        data.cards.forEach((card) => {
          renderIfUserHasRaised(card.id);
        });
        break;
      case "reset":
        $("#cards").empty();
        resetOwnCards();
        countCards();
        document
          .querySelectorAll(`div.user>span.has-raised`)
          .forEach((dot) => dot.remove());
        break;
      case "connected":
        renderUsers(data);
        data.connected.forEach((user) => {
          renderIfUserHasRaised(user.id);
        });
        break;
      default:
        $("#cards").append(msg.data);
    }
  };

  socket.onclose = function (msg) {
    resetOwnCards();
    $("#counts").remove();
    $("#cards").empty();
    $("#col-users").remove();
    $("#cards").append(
      '<div class="disconnected">Deine Verbindung wurde beendet! <a href="/">Zur&uuml;ck zum Beitreten-Bildschirm</a></div>'
    );
  };

  function renderCard(data) {
    if (data.type === "raise") {
      let card = `<div id="${data.id}${data.card}" class="card-common card-${data.card}">${data.name}</div>`;
      $("#cards").append(card);
    } else {
      $(`#${data.id}${data.card}`).remove();
    }
    if (uid && data.id === uid) setCardButton(data.card, data.type === "raise");
  }

  function renderIfUserHasRaised(id) {
    let usersCards = document.querySelectorAll(`div.card-common[id^="${id}"]`);
    let user = document.querySelector(`div.user[id="${id}"]`);
    let currentSpan = document.querySelector(
      `div.user[id="${id}"]>span.has-raised`
    );
    if (currentSpan) currentSpan.remove();

    if (user && usersCards.length > 0) {
      user.innerHTML =
        "<span class='has-raised'>&bull;</span>" + user.innerHTML;
      let kickBtn = document.querySelector(`div.user[id="${id}"] a.kickBtn`);
      if (kickBtn) kickBtn.addEventListener("click", () => kickUser(id));
    }
  }

  function compareUsers(a, b) {
    if (a.name.localeCompare(b.name) != 0) {
      return a.name.localeCompare(b.name);
    } else {
      return a.id.localeCompare(b.id);
    }
  }

  function renderUsers(data) {
    let users = data.connected.sort(compareUsers);
    $("#users").empty();
    users.forEach((user) => {
      $("#users").append(
        `<div class='user' id='${user.id}'>${user.name}<span><a class='kickBtn reset-hide'>X</a></span></div>`
      );
    });

    $("#users .kickBtn").each(function () {
      $(this).on("click", () => kickUser($(this).closest(".user").attr("id")));
    });

    if (!$("#resetRow").hasClass("reset-hide")) {
      $(".kickBtn").each(function () {
        $(this).toggleClass("reset-hide");
      });
    }
  }

  function kickUser(id) {
    socket.send(
      JSON.stringify({
        type: "kick",
        id,
      })
    );
  }

  function countCards() {
    Object.keys(ownColors).forEach((color) => {
      $(`#count-${color}`).text($(`#cards .card-${color}`).length);
    });
  }

  function resetOwnCards() {
    Object.keys(ownColors).forEach((color) => {
      $(`#${color}Btn`).addClass("btn-color-unselected");
      $(`#${color}Btn`).removeClass("btn-color-selected");
      ownColors[color] = false;
    });
  }

  function setCardButton(color, raised) {
    ownColors[color] = raised;
    let button = $(`#${color}Btn`);
    let selected = "btn-color-selected";
    let unselected = "btn-color-unselected";
    if (raised) {
      button.addClass(selected);
      button.removeClass(unselected);
    } else {
      button.removeClass(selected);
      button.addClass(unselected);
    }
  }

  Object.keys(ownColors).forEach((color) => {
    $(`#${color}Btn`).on("click", function (event) {
      event.preventDefault();
      socket.send(
        JSON.stringify({
          type: ownColors[color] ? "lower" : "raise",
          card: `${color}`,
        })
      );
    });
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

  $("#modal-share").on("show.bs.modal", function (event) {
    $("#button-copy-url").text("Link kopieren");
  });

  document.body.addEventListener("keypress", (event) => {
    if (event.key && event.key === "R") {
      $("#resetRow").toggleClass("reset-show");
      $("#resetRow").toggleClass("reset-hide");
      $("#users .kickBtn").each(function () {
        $(this).toggleClass("reset-show");
        $(this).toggleClass("reset-hide");
      });
    }
  });
});
