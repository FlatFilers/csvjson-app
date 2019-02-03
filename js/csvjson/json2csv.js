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
	 * Copyright (c) 2018-2019 Martin Drapeau
	 *
	 */

	var errorMissingSeparator = 'Missing separator option.',
		  errorEmpty = 'JSON is empty.',
		  errorEmptyHeader = 'Could not detect header. Ensure first row cotains your column headers.',
		  errorNotAnArray = 'Your JSON must be an array or an object.',
		  errorItemNotAnObject = 'Item in array is not an object: {0}';

  function flattenArray(array, ancestors) {
    ancestors || (ancestors = []);

    function combineKeys(a, b) {
      var result = a.slice(0);
      if (!Array.isArray(b)) return result;
      for (var i = 0; i < b.length; i++)
        if (result.indexOf(b[i]) === -1) result.push(b[i]);
      return result;
    }

    function extend(target, source) {
      target = target || {};
      for (var prop in source) {
        if (typeof source[prop] === 'object') {
          target[prop] = extend(target[prop], source[prop]);
        } else {
          target[prop] = source[prop];
        }
      }
      return target;
    }

    var rows = [];
    for (var i = 0; i < array.length; i++) {
      var o = array[i],
          row = {},
          orows = {},
          count = 1;

      if (o !== undefined && o !== null && (!isObject(o) || Array.isArray(o)))
        throw errorItemNotAnObject.replace('{0}', JSON.stringify(o));

      var keys = getKeys(o);
      for (var k = 0; k < keys.length; k++) {
        var value = o[keys[k]],
            keyChain = combineKeys(ancestors, [keys[k]]),
            key = keyChain.join('.');
        if (Array.isArray(value)) {
          orows[key] = flattenArray(value, keyChain);
          count += orows[key].length;
        } else {
          row[key] = value;
        } 
      }

      if (count == 1) {
        rows.push(row);
      } else {
        var keys = getKeys(orows);
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          for (var r = 0; r < orows[key].length; r++) {
            rows.push(extend(extend({}, row), orows[key][r]));
          }
        }
      }
    }
    return rows;
  }

  function isObject(o) {
    return o && typeof o == 'object';
  }

  function getKeys(o) {
    if (!isObject(o)) return [];
    return Object.keys(o);
  }

	function convert(data, options) {
		options || (options = {});
		
    if (!isObject(data)) throw errorNotAnArray;
    if (!Array.isArray(data)) data = [data];
		
    var separator = options.separator;
		if (!separator) throw errorMissingSeparator;

    var flatten = options.flatten || false;
    if (flatten) data = flattenArray(data);

    var allKeys = [],
        allRows = [];
    for (var i = 0; i < data.length; i++) {
    	var o = data[i],
    			row = {};
    	if (o !== undefined && o !== null && (!isObject(o) || Array.isArray(o)))
    		throw errorItemNotAnObject.replace('{0}', JSON.stringify(o));
    	var keys = getKeys(o);
    	for (var k = 0; k < keys.length; k++) {
    		var key = keys[k];
    		if (allKeys.indexOf(key) === -1) allKeys.push(key);
    		var value = o[key];
    		if (value === undefined && value === null) continue;
        if (typeof value == 'string') {
          row[key] = '"' + value.replace(/"/g, options.output_csvjson_variant ? '\\"' : '""') + '"';
          if (options.output_csvjson_variant) row[key] = row[key].replace(/\n/g, '\\n');
        } else {
          row[key] = JSON.stringify(value);
          if (!options.output_csvjson_variant && (isObject(value) || Array.isArray(value)))
            row[key] = '"' + row[key].replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
        }
    	}
    	allRows.push(row);
    }

    keyValues = [];
    for (var i = 0; i < allKeys.length; i++) {
      keyValues.push('"' + allKeys[i].replace(/"/g, options.output_csvjson_variant ? '\\"' : '""') + '"');
    }

    var csv = keyValues.join(separator)+'\n';
    for (var r = 0; r < allRows.length; r++) {
    	var row = allRows[r],
    			rowArray = [];
    	for (var k = 0; k < allKeys.length; k++) {
    		var key = allKeys[k];
    		rowArray.push(row[key] || (options.output_csvjson_variant ? 'null' : ''));
    	}
    	csv += rowArray.join(separator) + '\n';
    }
    
    return csv;
	}
	
	this.CSVJSON || (this.CSVJSON = {});
	this.CSVJSON.json2csv = convert;
	
}).call(this);