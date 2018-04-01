(function() {
	/**
	 *
	 * CSVJSON.csv2json(csv, options)
	 *
	 * Converts CSV to JSON. Returns an object. Use JSON.stringify to conver to a string.
	 *
	 * Available options:
	 *  - separator: Optional. Character which acts as separator. If omitted,
	 *               will attempt to detect comma (,), semi-colon (;) or tab (\t).
   *  - parseNumbers: Optional. Will attempt to convert a value to a number, if possible.
   *  - parseJSON: Optional. Will attempt to conter a value to a valid JSON value if possible.
   *               Detects numbers, null, false, true, [] and {}.
	 *
	 * Dependencies: 
	 *  - underscore (http://underscorejs.org/)
	 *  - underscore.string (https://github.com/epeli/underscore.string)
	 *
	 * Copyright (c) 2014 Martin Drapeau
	 *
	 */

  var errorDetectingSeparator = "We could not detect the separator.",
      errorNotWellFormed = "CSV is not well formed",
      errorEmpty = "Please upload a file or type in something.",
      errorEmptyHeader = "Could not detect header. Ensure first row cotains your column headers.",
      separators = [",", ";", "\t"];

  function detectSeparator(csv) {
    var counts = {},
    sepMax;
    _.each(separators, function(sep, i) {
      var re = new RegExp(sep, 'g');
      counts[sep] = (csv.match(re) || []).length;
      sepMax = !sepMax || counts[sep] > counts[sepMax] ? sep : sepMax;
    });
    return sepMax ? sepMax : undefined;
  }

  // source: https://stackoverflow.com/questions/8493195/how-can-i-parse-a-csv-string-with-javascript-which-contains-comma-in-data
  function CSVtoArray(text, delimiter) {
    delimiter || (delimiter = ',');
    
    var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    if (delimiter == ';') {
      re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^;'"\s\\]*(?:\s+[^;'"\s\\]+)*)\s*(?:;\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^;'"\s\\]*(?:\s+[^;'"\s\\]+)*)\s*)*$/;
      re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^;'"\s\\]*(?:\s+[^;'"\s\\]+)*))\s*(?:;|$)/g;
    }
    else if (delimiter == '\t') {
      re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^\t'"\s\\]*(?:\s+[^\t'"\s\\]+)*)\s*(?:\t\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^\t'"\s\\]*(?:\s+[^\t'"\s\\]+)*)\s*)*$/;
      re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^\t'"\s\\]*(?:\s+[^\t'"\s\\]+)*))\s*(?:\t|$)/g;
    }

    if (!re_valid.test(text)) return null;
    var a = [];                     // Initialize array to receive values.
    text.replace(re_value, // "Walk" the string using replace with callback.
      function(m0, m1, m2, m3) {
        // Remove backslash from \' in single quoted values.
        if (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
        // Remove backslash from \" in double quoted values.
        else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
        else if (m3 !== undefined) a.push(m3);
        return ''; // Return empty string.
      });
    // Handle special case of empty last value.
    if (/,\s*$/.test(text)) a.push('');
    return a;
  };

  function convert(csv, options) {
    options || (options = {});
    if (csv.length == 0) throw errorEmpty;

    var separator = options.separator || detectSeparator(csv);
    if (!separator) throw errorDetectingSeparator;

    var lines = csv.split(/\r?\n/),
        a = [];
    for (var l = 0; l < lines.length; l++) {
      var line = CSVtoArray(lines[l], options.separator);
      if (line === null) throw errorNotWellFormed+'\n'+lines[l];
      a.push(line)
    }


    if (options.transpose) a = _.zip.apply(_, a);

    var keys = a.shift();
    if (keys.length == 0) throw errorEmptyHeader;
    keys = _.map(keys, function(key) {
      return _(key).chain().trim().trim('"').value();
    });

    var	json = options.hash ? {} : [];
    for (var l = 0; l < a.length; l++) {
      var row = {},
      hashKey;
      for (var i = 0; i < keys.length; i++) {
        var value = _(a[l][i]).chain().trim().trim('"').value(),
            number = value === "" ? NaN : value - 0;
        if (options.hash && i == 0) {
          hashKey = value;
        }
        else {
          if (options.parseJSON || options.parseNumbers && !isNaN(number)) {
            try {
              row[keys[i]] = JSON.parse(value);
            } catch(error) {
              row[keys[i]] = value;
            }
          }
          else {
            row[keys[i]] = value;
          }
        }
      }
      if (options.hash)
        json[hashKey] = row;
      else
        json.push(row);
      }

    return json;
  };

  this.CSVJSON || (this.CSVJSON = {});
  this.CSVJSON.csv2json = convert;

}).call(this);