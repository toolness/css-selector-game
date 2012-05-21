"use strict";

var currLevel;

function getLevelConfig(number, cb) {
  var levelJSON, levelHTML;

  function maybeCallCb() {
    if (levelJSON && levelHTML) {
      var parts = levelHTML.split("\n--\n");
      levelJSON.instructions = parts[0];
      levelJSON.html = parts[1];
      cb(levelJSON);
    }
  }
  
  if (number < 10)
    number = "0" + number;
  
  $.getJSON("levels/" + number + ".json", function(json) {
    levelJSON = json;
    maybeCallCb();
  });
  $.get("levels/" + number + ".html", function(html) {
    levelHTML = html;
    maybeCallCb();
  }, "text");
}

function loadLevel(number) {
  if (currLevel == number)
    return;
  currLevel = number;
  $("body").removeClass("visible");
  getLevelConfig(number, function(cfg) {
    if (currLevel != number)
      return;
    $(".level-number").text(number.toString());
    $("#quick-keys button").each(function() {
      var character = this.firstChild.nodeValue;
      if (cfg.keys.indexOf(character) == -1)
        $(this).hide();
      else
        $(this).show();
    });
    $("#quick-keys").show();
    $("#instructions").html(cfg.instructions);
    $("body").addClass("visible");

    var result = Slowparse.HTML(document, cfg.html);
    var solution = result.document.querySelectorAll(cfg.selector);
    $("code#html").text(cfg.html);
  });
}

$(window).bind("hashchange", function() {
  var hash = window.location.hash.slice(1);
  var level = hash.match(/^[0-9]+$/) ? parseInt(hash) : 1;
  loadLevel(level);
});

$(window).ready(function() {
  var TOUCH_EVT = ("ontouchstart" in window) ? "touchstart" : "click";
  $("input").bind("keyup", function() {
    
  });
  $("#quick-keys button").bind(TOUCH_EVT, function() {
    var character = this.firstChild.nodeValue;
    $("input").val($("input").val() + character).focus();
    return false;
  });
  $(window).trigger("hashchange");
});
