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
	 *
	 * Dependencies:
	 *  - underscore (http://underscorejs.org/)
	 *  - underscore.string (https://github.com/epeli/underscore.string)
	 *
	 * Copyright (c) 2014 Martin Drapeau
	 *
	 */

	var errorMissingSeparator = 'Missing separator option.',
		  errorEmpty = 'Please upload a file or type in something.',
		  errorEmptyHeader = 'Could not detect header. Ensure first row cotains your column headers.',
		  errorNotAnArray = 'Your JSON must be an array or objects.',
		  errorItemNotAnObject = 'Item is not an object: {0}',
      errorHelp = "\n\nOH NO! I don't know how to convert that. Help me understand what you want. Click on the button below to report a bug or suggestion.";

	function convert(json, options) {
		options || (options = {});

		var data = jsonlint.parse(json);
    if (!_.isArray(data)) throw errorNotAnArray + errorHelp;
		
    var separator = options.separator;
		if (!separator) throw errorMissingSeparator;

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
    		if (value !== undefined && value !== null) row[key] = JSON.stringify(value);
    	}
    	allRows.push(row);
    }

    var csv = '';
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