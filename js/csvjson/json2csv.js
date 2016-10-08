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

	var errorMissingSeparator = "Missing separator option.",
		  errorEmpty = "Please upload a file or type in something.",
		  errorEmptyHeader = "Could not detect header. Ensure first row cotains your column headers.";

	function convert(json, options) {
		options || (options = {});
		if (json.length == 0) throw errorEmpty;
		
		var separator = options.separator;
		if (!separator) throw errorMissingSeparator;

    // TODO...
    
    return json;
	}
	
	this.CSVJSON || (this.CSVJSON = {});
	this.CSVJSON.json2csv = convert;
	
}).call(this);