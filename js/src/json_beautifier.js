/*
 * JSON Beautifier
 *
 * Copyright (c) 2014 Martin Drapeau
 */
CSVJSON.json_beautifier = function() {

	var errorEmpty = "Please upload a file or type in something.";

	var uploadUrl = "/json_beautifier/upload",
		spaceMap = {
			'tab': '\t',
			'1': 1,
			'2': 2,
			'3': 3,
			'4': 4,
			'.': '.',
			'..': '..'
		};
	
	var $file = $('#fileupload'),
		$json = $('#json'),
		$result = $('#result'),
		$clear = $('a.clear'),
		$convert = $('#convert');
	
	CSVJSON.bindFileUploadToFillTextarea($file, uploadUrl, $json);
	CSVJSON.bindClear($clear);
	
	function err(error) {
		CSVJSON.reportError($result, error);
		return false;
	}
	
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
	
	$convert.click(function(e) {
		var space = spaceMap[$('#space').val()],
			dropQuotesOnKeys = $('#drop-quotes-on-keys').is(':checked'),
			dropQuotesOnNumbers = $('#drop-quotes-on-numbers').is(':checked');
		
		var json = _.trim($json.val());
		if (json.length == 0) err(errorEmpty);
		
		var object, result;
		try {
			object = jsonlint.parse(json);
			if (dropQuotesOnNumbers) walkObjectAndDropQuotesOnNumbers(object);
			result = JSON3.stringify(object, null, space, dropQuotesOnKeys);
			$result.removeClass('error').val(result);
		} catch (error) {
			err(error);
		}
	});
	
};