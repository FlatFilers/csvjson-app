(function() {
	/**
	 *
	 * CSVJSON.json_beautifier(json, options)
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
	 *  - json2-mod.js (Modified https://github.com/douglascrockford/JSON-js)
	 *  - jsonlint.js (https://github.com/zaach/jsonlint)
	 *  - underscore (http://underscorejs.org/)
	 *  - underscore.string (https://github.com/epeli/underscore.string)
	 *
	 * Copyright (c) 2014 Martin Drapeau
	 *
	 */
	
	
	// Recursively walk an object to convert strings that are numbers
	// to pure integers or floats.
	function walkObjectAndDropQuotesOnNumbers(object) {
		if (!_.isObject(object)) return;
		
		_.each(object, function(value, key) {
			if (_.isString(value)) {
				var number = value - 0;
				object[key] = isNaN(number) ? value : number;
			} else if (_.isObject(value) || _.isArray(value)) {
				walkObjectAndDropQuotesOnNumbers(value);
			}
		});
	}
	
	// Collapses arrays inline when they fit inside 80 characters (including indentation).
	function inlineShortArraysInResult(result) {
		var list = result.split('\n'),
			i = 0,
			start = null,
			content = [];
		while (i < list.length) {
			if (list[i].match(/\[$/)) {
				start = i;
			} else if (list[i].match(/\],?$/) && start) {
				var inline = list[start] + content.join(' ') + _.trim(list[i]);
				if (inline.length < 80) {
					list.splice(start, i-start+1, inline);
					i = start;
				}
				start = null;
				content = [];
			} else {
				if (start) content.push(_.trim(list[i]));
			}
			i += 1;
		}
		return list.join('\n');
	}
	
	function convert(json, options) {
		if (json.length == 0) throw errorEmpty;
		
		var space = options.space || 2,
			dropQuotesOnKeys = options.dropQuotesOnKeys || false,
			dropQuotesOnNumbers = options.dropQuotesOnNumbers || false,
			inlineShortArrays = options.inlineShortArrays || false;

		var object = jsonlint.parse(json);
		if (dropQuotesOnNumbers) walkObjectAndDropQuotesOnNumbers(object);
		
		var result = JSON2_mod.stringify(object, null, space, dropQuotesOnKeys);
		if (inlineShortArrays) result = inlineShortArraysInResult(result);
		
		return result;
	};
	 
	this.CSVJSON || (this.CSVJSON = {});
	this.CSVJSON.json_beautifier = convert;
	
}).call(this);