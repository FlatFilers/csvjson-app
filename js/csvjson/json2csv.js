(function() {
	/**
	 *
	 * CSVJSON.json2csv(json, options)
	 *
	 * Converts JSON to CSV
	 *
	 * Available options:
	 *  - separator: Character which acts as separator. For CSV use a comma (,).
	 *               For TSV use a tab (\t).
   *  - flatten: Boolean indicating whether to flatten nested arrays or not.
   *             Optional. Default false.
   *  - output_csvjson_variant: Boolean indicating whether to output objects and
   *             arrays as is as per the CSVJSON format variant. Default is false.
	 *
	 * Dependencies:
	 *  - underscore (http://underscorejs.org/)
	 *  - underscore.string (https://github.com/epeli/underscore.string)
   *  - jsonlint.js (https://github.com/zaach/jsonlint)
	 *
	 * Copyright (c) 2018 Martin Drapeau
	 *
	 */

	var errorMissingSeparator = 'Missing separator option.',
		  errorEmpty = 'Please upload a file or type in something.',
		  errorEmptyHeader = 'Could not detect header. Ensure first row cotains your column headers.',
		  errorNotAnArray = 'Your JSON must be an array or an object.',
		  errorItemNotAnObject = 'Item in array is not an object: {0}',
      errorHelp = "\n\nOH NO! I don't know how to convert that. Help me understand what you want. Click on the button below to report a bug or suggestion.";

  function flattenArray(array, ancestors) {
    ancestors || (ancestors = []);

    var rows = [];
    for (var i = 0; i < array.length; i++) {
      var o = array[i],
          row = {},
          orows = {},
          count = 1;

      if (o !== undefined && o !== null && (!_.isObject(o) || _.isArray(o)))
        throw errorItemNotAnObject.replace('{0}', JSON.stringify(o)) + errorHelp;

      var keys = _.keys(o);
      for (var k = 0; k < keys.length; k++) {
        var value = o[keys[k]],
            keyChain = _.union(ancestors, [keys[k]]),
            key = keyChain.join('.');
        if (_.isArray(value)) {
          orows[key] = flattenArray(value, keyChain);
          count += orows[key].length;
        } else {
          row[key] = value;
        } 
      }

      if (count == 1) {
        rows.push(row);
      } else {
        var keys = _.keys(orows);
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          for (var r = 0; r < orows[key].length; r++) {
            rows.push(_.extend({}, row, orows[key][r]));
          }
        }
      }
    }
    return rows;
  }

	function convert(json, options) {
		options || (options = {});

		var data = jsonlint.parse(json);
    if (!_.isObject(data)) throw errorNotAnArray + errorHelp;
    if (!_.isArray(data)) data = [data];
		
    var separator = options.separator;
		if (!separator) throw errorMissingSeparator;

    var flatten = options.flatten || false;
    if (flatten) data = flattenArray(data);

    var allKeys = [],
        allRows = [];
    for (var i = 0; i < data.length; i++) {
    	var o = data[i],
    			row = {};
    	if (o !== undefined && o !== null && (!_.isObject(o) || _.isArray(o)))
    		throw errorItemNotAnObject.replace('{0}', JSON.stringify(o)) + errorHelp;
    	var keys = _.keys(o);
    	for (var k = 0; k < keys.length; k++) {
    		var key = keys[k];
    		if (allKeys.indexOf(key) === -1) allKeys.push(key);
    		var value = o[key];
    		if (value === undefined && value === null) continue;
        if (_.isString(value)) {
          row[key] = '"' + value.replace(/"/g, '\\"') + '"';
        } else {
          row[key] = JSON.stringify(value);
          if (!options.output_csvjson_variant && (_.isObject(value) || _.isArray(value)))
            row[key] = '"' + row[key].replace(/"/g, '\\"') + '"';
        }
    	}
    	allRows.push(row);
    }

    var csv = allKeys.join(separator)+'\n';
    for (var r = 0; r < allRows.length; r++) {
    	var row = allRows[r],
    			rowArray = [];
    	for (var k = 0; k < allKeys.length; k++) {
    		var key = allKeys[k];
    		rowArray.push(row[key] || '');
    	}
    	csv += rowArray.join(separator) + '\n';
    }
    
    return csv;
	}
	
	this.CSVJSON || (this.CSVJSON = {});
	this.CSVJSON.json2csv = convert;
	
}).call(this);