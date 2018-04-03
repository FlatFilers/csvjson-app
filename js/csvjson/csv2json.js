(function() {
	/**
	 *
	 * CSVJSON.csv2json(csv, options)
	 *
	 * Converts CSV to JSON. Returns an object. Use JSON.stringify to convert to a string.
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

  // Picks the separator we find the most.
  function detectSeparator(csv) {
    var counts = {},
        sepMax;
    _.each(separators, function(sep, i) {
      var re = new RegExp(sep, 'g');
      counts[sep] = (csv.match(re) || []).length;
      sepMax = !sepMax || counts[sep] > counts[sepMax] ? sep : sepMax;
    });
    return sepMax;
  }

  function convert(csv, options) {
    options || (options = {});
    if (csv.length == 0) throw errorEmpty;

    var separator = options.separator || detectSeparator(csv);
    if (!separator) throw errorDetectingSeparator;

    var a = [];
    try {
      var a = csvParser.parse(csv);
    } catch(error) {
      var start = csv.lastIndexOf('\n', error.offset),
          end = csv.indexOf('\n', error.offset),
          line = csv.substring(start >= -1 ? start : 0, end > -1 ? end : csv.length);
      throw error.message + ' On line ' + error.line + ' and column ' + error.column + '.\n' + line;
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