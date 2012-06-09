"use strict";

var FADE_OUT_DELAY = 650;
var WIN_DELAY = 2000;

var currLevel;

function getLevelConfig(number, cb, delay) {
  var levelJSON, levelHTML, timeout = setTimeout(function() {
    timeout = null;
    maybeCallCb();
  }, delay);

  function maybeCallCb() {
    if (levelJSON && levelHTML && timeout === null) {
      var parts = levelHTML.split("\n--\n");
      levelJSON.instructions = parts[0];
      levelJSON.html = parts[1] || "";
      cb(levelJSON);
    }
  }
  
  if (number < 10)
    number = "0" + number;
  
  $.getJSON("levels/" + number + ".json", function(json) {
    levelJSON = json;
    maybeCallCb();
  });
  $.ajax({
    url: "levels/" + number + ".html",
    dataType: "text",
    success: function(html) {
      levelHTML = html;
    },
    error: function(req) {
      levelJSON = {selector: null, keys: []};
      if (req.status == 404)
        levelHTML = $("#level-not-found").html();
      else
        levelHTML = $("#level-load-error").html();
    },
    complete: function() {
      maybeCallCb();
    }
  });
}

function showHighlights(html, slices) {
  function sourceText(interval) {
    return html.slice(interval.start, interval.end);
  }
  
  var newSource = $("<div></div>"),
      i = 0;
  slices.sort(function(a, b) { return a.start - b.start; });
  $.each(slices, function(n, slice) {
    var span = $("<span></span>");
    if (slice.start > i) {
      newSource.append(document.createTextNode(sourceText({
        start: i,
        end: slice.start
      })));
    }
    span.addClass("highlight")
      .text(sourceText(slice))
      .appendTo(newSource);
    i = slice.end;
  });
  if (i < html.length) {
    newSource.append(document.createTextNode(sourceText({
      start: i,
      end: undefined
    })));
  }
  $("code#html").html(newSource.html());
  setTimeout(function() {
    $("code#html .highlight").addClass("visible");
  }, 0);
}

function makeArray(arr) {
  var realArray = [];
  for (var i = 0; i < arr.length; i++)
    realArray.push(arr[i]);
  return realArray;
}

// http://stackoverflow.com/questions/1773069/using-jquery-to-compare-two-arrays
function areEqual(arr1, arr2) {
  return ($(arr1).not(arr2).length == 0 &&
          $(arr2).not(arr1).length == 0);
}

function winLevel() {
  $("input").attr("disabled", "disabled");
  setTimeout(function() {
    $("input").blur();
    window.location.hash = "#" + (currLevel + 1);
  }, WIN_DELAY);
}

function activateLevelGameLogic(cfg) {
  var docFrag = Slowparse.HTML(document, cfg.html).document;
  var solution = makeArray(docFrag.querySelectorAll(cfg.selector));
  $("input").bind("keyup change", function() {
    if ($(this).attr("disabled"))
      return;
    var selector = $(this).val();
    var selection = [];
    try {
      selection = makeArray(docFrag.querySelectorAll(selector));
    } catch (e) {}
    if (selection.length) {
      var intervals = selection.map(function(node) { return {
        start: node.parseInfo.openTag.start,
        end: node.parseInfo.closeTag.end
      }});
      showHighlights(cfg.html, intervals);
      if (areEqual(selection, solution))
        winLevel();
    } else
      $("code#html").text(cfg.html);
  }).val("");
}

function loadLevel(number) {
  if (currLevel == number)
    return;
  currLevel = number;
  var delay = $("body").hasClass("visible") ? FADE_OUT_DELAY : 0;
  $("body").removeClass("visible");
  $("input").unbind();
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
    $("input").show().removeAttr("disabled");
    if (cfg.selector)
      activateLevelGameLogic(cfg);
    else {
      $("input").hide();
      $("code#html").empty();
    }
    // Firefox
    document.documentElement.scrollTop = 0;
    // Mobile Safari
    document.body.scrollTop = 0;
    
    // Really not sure why we need a timeout to trigger these properly...
    setTimeout(function() {
      $("body").addClass("visible");
      $("input").trigger("change");
    }, 1);
  }, delay);
}

function virtualKeypress() {
  var character = this.firstChild.nodeValue;
  var input = $("input")[0];
  // Use selectionEnd instead of selectionStart because Mobile Chrome
  // sometimes selects-all while in weird Android keyboard autocomplete mode.
  var caret = input.selectionEnd;
  var oldVal = $(input).val();
  var newVal = oldVal.slice(0, caret) + character + oldVal.slice(caret);
  var moveCursor = function() { input.setSelectionRange(caret+1, caret+1); };
  $(input).val(newVal).focus().trigger("change");
  moveCursor();
  // Move the cursor after a bit because Mobile Chrome positions it
  // right before the character we want to be at, for some reason.
  setTimeout(moveCursor, 100);
  return false;
}

$(window).bind("hashchange", function() {
  var hash = window.location.hash.slice(1);
  var level = hash.match(/^[0-9]+$/) ? parseInt(hash) : 1;
  loadLevel(level);
});

$(window).ready(function() {
  var TOUCH_EVT = ("ontouchstart" in window) ? "touchstart" : "click";
  $("#quick-keys button").bind(TOUCH_EVT, virtualKeypress);
  $(window).trigger("hashchange");
});
