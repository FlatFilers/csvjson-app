(function() {
  /**
   *
   * CSVJSON.json_beautifier(object, options)
   *
   * Validates and formats JSON. Returns a JSON string.
   *
   * Available options:
   *  - space: 
   *  - dropQuotesOnKeys: 
   *  - dropQuotesOnNumbers: 
   *  - inlineShortArrays: 
   *
   * Dependencies:
   *  - json2-mod.js https://github.com/martindrapeau/json2-mod
   *
   * Copyright (c) 2014-2019 Martin Drapeau
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
  
  // Collapses arrays inline when they fit inside 80 characters (including indentation).
  function inlineShortArraysInResult(result) {
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
        if (inline.length < 80) {
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
      var newResult = inlineShortArraysInResult(result);
      if (inlineShortArraysDepth > 1) {
        for (var i = 1; i < inlineShortArraysDepth; i++) {
          result = newResult;
          newResult = inlineShortArraysInResult(result);
          if (newResult == result) break;
        }
      }
      result = newResult;
    }
    
    return result;
  };

  // CommonJS or Browser
  if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
          exports = module.exports = convert;
      }
      exports.json_beautifier = convert;
  } else {
    this.CSVJSON || (this.CSVJSON = {});
    this.CSVJSON.json_beautifier = convert;
  }
  
}).call(this);
