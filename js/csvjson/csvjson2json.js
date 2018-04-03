(function() {
  /**
   *
   * CSVJSON.csvjson2json(csv, options)
   *
   * Converts CSVJSON format variant (http://csvjson.org) to JSON. Returns an object.
   *
   * Available options:
   *  None
   *
   * Dependencies: 
   *  - underscore (http://underscorejs.org/)
   *  - underscore.string (https://github.com/epeli/underscore.string)
   *
   * Copyright (c) 2018 Martin Drapeau
   *
   */

  var errorEmpty = "Please upload a file or type in something.",
      errorEmptyHeader = "Could not detect header. Ensure first row cotains your column headers.";

  function convert(csv, options) {
    options || (options = {});
    if (csv.length == 0) throw errorEmpty;

    var lines = csv.split(/\r?\n/),
        a = [];
    for (var l = 0; l < lines.length; l++) {
      try {
        var line = JSON.parse('['+lines[l]+']');
      } catch (error) {
        throw 'Malformed JSON on line ' + l + ': ' + error + '\n' + lines[l];
      }
      a.push(line)
    }

    var keys = a.shift();
    if (keys.length == 0) throw errorEmptyHeader;
    for (var i = 0; i < keys.length; i++) {
      if (!_.isString(keys[i])) throw 'Header value is invalid. It must be a string.\n' + JSON.stringify(keys[i]);
    }

    var json = [];
    for (var l = 0; l < a.length; l++) {
      var row = {};
      for (var i = 0; i < keys.length; i++) {
        row[keys[i]] = a[l][i];
      }
      json.push(row);
    }

    return json;
  };

  this.CSVJSON || (this.CSVJSON = {});
  this.CSVJSON.csvjson2json = convert;

}).call(this);