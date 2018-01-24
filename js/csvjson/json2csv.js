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


	function convert(json, options) {
		options || (options = {});

		var data = jsonlint.parse(json);
    if (!_.isObject(data)) throw errorNotAnArray + errorHelp;
    if (!_.isArray(data)) data = [data];
		
    var separator = options.separator;
		if (!separator) throw errorMissingSeparator;

    var flatten = options.flatten || false;

    var allKeys = [],
    		allRows = [];

    if (flatten) {
      var merge = function(objects) {
        var out = {};
        for (var i = 0; i < objects.length; i++) {
          for (var p in objects[i]) {
            out[p] = objects[i][p];
          }
        }
        return out;
      }
      var flatten = function(obj, name, stem) {
        var out = {};
        var newStem = (typeof stem !== 'undefined' && stem !== '') ? stem + '_' + name : name;

        if (typeof obj !== 'object') {
          out[newStem] = obj;
          return out;
        }

        for (var p in obj) {
          var prop = flatten(obj[p], p, newStem);
          out = merge([out, prop]);
        }

        return out;
      };
      data = flatten(data);
    }

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
          row[key] = value;
        } else {
          row[key] = JSON.stringify(value);
        }
        if (row[key].indexOf('"') !== -1 || row[key].indexOf(separator) !== -1)
          row[key] = '"' + row[key].replace(/"/g, '""') + '"';
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