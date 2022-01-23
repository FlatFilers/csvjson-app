(function() {
  /**
   *
   * CSVJSON.json_beautifier(object, options)
   *
   * Parses, validates, beautifies and formats JSON. Returns a JSON string.
   *
   * Available options:
   *  - space: The number of spaces to indent. Default is 2.
   *  - quoteType: You can change double quotes to single quotes (') if you
   *           like to. Will make for invalid JSON but valid JavaScript.
   *           Default is (").
   *  - dropQuotesOnKeys: JSON wraps keys with double quotes by default.
   *           JavaScript doesn't need them though. Set to true to drop them.
   *           Will make for invalid JSON but valid JavaScript. Default is false.
   *  - dropQuotesOnNumbers: Set to true to parse number values and drop quotes
   *           around them. Default is false.
   *  - inlineShortArrays: Set to true to collpase arrays inline if less than 80
   *           characters. You can also set to an arbitrary number such as 160 to
   *           change the width. Default is `false`.
   *  - inlineShortArraysDepth: If you turned on the above option, your can limit
   *           the nesting depth. Default is 1.
   *  - minify: Set to `true` to simply compact the JSON. Removes indentations and
   *           new lines. Default is `false`.
   *
   * Dependencies:
   *  - json2-mod.js https://github.com/martindrapeau/json2-mod
   *
   * Copyright (c) 2022 Flatfile
   *
   */

  // Recursively walk an object to convert strings that are numbers
  // to pure integers or floats.
  function walkObjectAndDropQuotesOnNumbers(object) {
    if (!isObject(object)) return;
    var keys = Object.keys(object);
    if (!keys) return;

    keys.forEach(function(key) {
      var value = object[key];
      if (typeof value == 'string') {
        var number = value - 0;
        object[key] = isNaN(number) ? value : number;
      } else if (isObject(value) || Array.isArray(value)) {
        walkObjectAndDropQuotesOnNumbers(value);
      }
    });
  }

  function isObject(o) {
    return o && typeof o == 'object';
  }

  // Collapses arrays inline when they fit inside the specified width
  // in characters (including indentation).
  function inlineShortArraysInResult(result, width) {
    width || (width = 80);
    if (typeof width != 'number' || width < 20) {
      throw "Invalid width '" + width + "'. Expecting number equal or larger than 20."
    }
    var list = result.split('\n'),
        i = 0,
        start = null,
        content = [];
    while (i < list.length) {
      var startMatch = !!list[i].match(/\[/),
          endMatch = !!list[i].match(/\],?/);

      if (startMatch && !endMatch) {
        content = [list[i]];
        start = i;
      } else if (endMatch && !startMatch && start) {
        content.push((list[i]||'').trim());
        var inline = content.join(' ');
        if (inline.length < width) {
          list.splice(start, i-start+1, inline);
          i = start;
        }
        start = null;
        content = [];
      } else {
        if (start) content.push((list[i]||'').trim());
      }
      i += 1;
    }
    return list.join('\n');
  }

  function convert(object, options) {
    var space = options.space || 2,
        dropQuotesOnKeys = options.dropQuotesOnKeys || false,
        dropQuotesOnNumbers = options.dropQuotesOnNumbers || false,
        inlineShortArrays = options.inlineShortArrays || false,
        inlineShortArraysDepth = options.inlineShortArraysDepth || 1,
        quoteType = options.quoteType || 'double',
        minify = options.minify || false;

    if (dropQuotesOnNumbers) walkObjectAndDropQuotesOnNumbers(object);

    var result = JSON2_mod.stringify(object, null, minify ? undefined : space, dropQuotesOnKeys, quoteType);
    if (inlineShortArrays && !minify) {
      var width = typeof inlineShortArrays == 'number' ? inlineShortArrays : 80;
      var newResult = inlineShortArraysInResult(result, width);
      if (inlineShortArraysDepth > 1) {
        for (var i = 1; i < inlineShortArraysDepth; i++) {
          result = newResult;
          newResult = inlineShortArraysInResult(result, width);
          if (newResult == result) break;
        }
      }
      result = newResult;
    }

    return result;
  };

  // CommonJS or Browser
  var JSON2_mod;
  if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
          exports = module.exports = convert;
      }
      JSON2_mod = require('json2-mod');
      exports.json_beautifier = convert;
  } else {
    JSON2_mod = window.JSON2_mod;
    this.CSVJSON || (this.CSVJSON = {});
    this.CSVJSON.json_beautifier = convert;
  }

}).call(this);
