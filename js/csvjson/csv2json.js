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
	 *
	 * Dependencies: 
	 *  - underscore (http://underscorejs.org/)
	 *  - underscore.string (https://github.com/epeli/underscore.string)
	 *
	 * Copyright (c) 2014 Martin Drapeau
	 *
	 */
	
	var errorDetectingSeparator = "We could not detect the separator.",
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
	
	function convert(csv, options) {
		options || (options = {});
		if (csv.length == 0) throw errorEmpty;
		
		var separator = options.separator || detectSeparator(csv);
		if (!separator) throw errorDetectingSeparator;
		
		var lines = _.lines(csv);
		if (lines.length == 0) throw errorEmpty;
		
		// Extract and clean
		var keys = _.words(lines.shift(), separator);
		if (keys.length == 0) throw errorEmptyHeader;
		keys = _.map(keys, function(key) {
			return _(key).chain().trim().trim('"').value();
		});
		
		// Extra data
		var	json = [];
		for (var l = 0; l < lines.length; l++) {
			var row = {};
			var items = _.words(lines[l], separator);
			for (var i = 0; i < keys.length; i++) {
				var value = _(items[i]).chain().trim().trim('"').value(),
					number = value - 0;
				row[keys[i]] = isNaN(number) ? value : number;
			}
			json.push(row);
		}
		
		return json;
	};
	
	this.CSVJSON || (this.CSVJSON = {});
	this.CSVJSON.csv2json = convert;
	
}).call(this);