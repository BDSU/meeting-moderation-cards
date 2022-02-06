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
    '/' + (participate ? "stimmung" : "zuschauer") +
    '/' + (participate ? joinId : viewId);
  let socket = new WebSocket(wsUrl, "stimmung"); // "ws://localhost:8080/"
  socket.onopen = function () {
    socket.send(
      JSON.stringify({
        type: "join",
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
        if (participate) resetOwnCards();
        countCards();
        document
          .querySelectorAll(`div.user>span.has-raised`)
          .forEach((dot) => dot.remove());
        break;
      case "connected":
        if (participate) {
          let self = data.connected.filter((c) => c.id === uid);
          if (self && self.length === 1) {
            renderHostTools(self[0].host);
          } else {
            renderHostTools(false); // force hide
          }
        }
        renderUsers(data);
        data.connected.forEach((user) => {
          renderIfUserHasRaised(user.id);
        });
        break;
    }
  };

  socket.onclose = function (msg) {
    if (participate) resetOwnCards();
    $("#counts").remove();
    $("#cards").empty();
    $("#col-users").remove();
    $("#cards").append(
      '<div class="disconnected">Deine Verbindung wurde beendet! <a href="javascript:window.location.reload()">Seite neu laden</a></div>'
    );
    renderHostTools(false);
  };

  function renderCard(data) {
    if (data.type === "raise") {
      let card = `<div id="${data.id}${data.card}" class="card-common card-${data.card}">${data.name}</div>`;
      $("#cards").append(card);
    } else {
      $(`#${data.id}${data.card}`).remove();
    }
    if (participate && uid && data.id === uid) setCardButton(data.card, data.type === "raise");
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
        `<div class='user' id='${user.id}'>${user.name}${
          user.host ? " (Host)" : ""
        }` +
          `${
            participate
              ? "<span><a class='kickBtn clickable reset-hide'><span class='kickIcon'></span></a></span>"
              : ""
          }` + // TODO optimize: direct render instead of toggling
          `${
            user.host
              ? "<span><a class='hostBtn hostBtn-demote reset-hide clickable'><span class='demoteIcon'></a></span>"
              : "<span><a class='hostBtn hostBtn-promote reset-hide clickable'><span class='promoteIcon'></a></span>"
          }` +
          `</div>`
      );
    });
    if (participate) {
      $("#users .kickBtn").each(function () {
        $(this).on("click", () =>
          kickUser($(this).closest(".user").attr("id"))
        );
      });

      $("#users .hostBtn-promote").each(function () {
        $(this).on("click", () =>
          promoteUser($(this).closest(".user").attr("id"))
        );
      });

      $("#users .hostBtn-demote").each(function () {
        $(this).on("click", () =>
          demoteUser($(this).closest(".user").attr("id"))
        );
      });

      if (!$("#resetRow").hasClass("reset-hide")) {
        $(".kickBtn, .hostBtn").each(function () {
          $(this).toggleClass("reset-hide");
        });
      }
    }
  }

  function renderHostTools(display) {
    if (display) {
      $("#resetRow").addClass("reset-show");
      $("#resetRow").removeClass("reset-hide");
      $("#users .kickBtn, #users .hostBtn").each(function () {
        $(this).addClass("reset-show");
        $(this).removeClass("reset-hide");
      });
    } else {
      $("#resetRow").removeClass("reset-show");
      $("#resetRow").addClass("reset-hide");
      $("#users .kickBtn, #users .hostBtn").each(function () {
        $(this).removeClass("reset-show");
        $(this).addClass("reset-hide");
      });
    }
  }

  function countCards() {
    Object.keys(ownColors).forEach((color) => {
      $(`#count-${color}`).text($(`#cards .card-${color}`).length);
    });
  }

  $("#modal-share").on("hidden.bs.modal", function (evt) {
    $(".btn-copy-url").each((idx, elem) => {
      elem.innerText = "Link kopieren";
    });
  });

  if (participate) {
    function kickUser(id) {
      socket.send(
        JSON.stringify({
          type: "kick",
          id,
        })
      );
    }

    function promoteUser(id) {
      socket.send(
        JSON.stringify({
          type: "promote",
          id,
        })
      );
    }

    function demoteUser(id) {
      socket.send(
        JSON.stringify({
          type: "demote",
          id,
        })
      );
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
    });

  }
});
