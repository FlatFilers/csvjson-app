/*
 * CSV to JSON
 *
 * Copyright (c) 2013 Martin Drapeau
 */
CSVJSON.csv2json = function() {

	var errorDetectingSeparator = "We could not detect the separator.",
		errorEmpty = "Please upload a file or type in something.",
		errorEmptyHeader = "Could not detect header. Ensure first row cotains your column headers.";

	var uploadUrl = "/csv2json/upload",
		charMap = {
			comma: ',',
			semiColon: ';',
			tab: '\t'
		};
	
	var $file = $('#fileupload'),
		$separator = $('input[type=radio][name="separator"]'),
		$csv = $('#csv'),
		$json = $('#json'),
		$clear = $('a.clear'),
		$convert = $('#convert');
	
	function getSeparator(csv) {
		var userSpecified = $separator.filter(':checked').val(),
			separator = charMap[userSpecified];
		if (separator) return separator;
		
		// Detect it ourself
		var counts = {},
			keyMax;
		_.each(charMap, function(c, k) {
			var re = new RegExp(c, 'g');
			counts[k] = (csv.match(re) || []).length;
			keyMax = !keyMax || counts[k] > counts[keyMax] ? k : keyMax;
		});
		return keyMax ? charMap[keyMax] : undefined;
	}
	
	CSVJSON.bindFileUploadToFillTextarea($file, uploadUrl, $csv);
	CSVJSON.bindClear($clear);
	
	function err(error) {
		CSVJSON.reportError($json, error);
		return false;
	}
	
	$convert.click(function(e) {
		var csv = _.trim($csv.val());
		if (csv.length == 0) return err(errorEmpty);
		
		var separator = getSeparator(csv);
		if (!separator) return err(errorDetectingSeparator);
		console.log('separator', separator);
		
		var lines = _.lines(csv);
		if (lines.length == 0) return err(errorEmpty);
		
		var keys = _.words(lines.shift(), separator);
		if (keys.length == 0) return err(errorEmptyHeader);
		
		var	json = [];
		for (var l = 0; l < lines.length; l++) {
			var row = {};
			var items = _.words(lines[l], separator);
			for (var i = 0; i < keys.length; i++) {
				var value = items[i] - 0;
				row[keys[i]] = isNaN(value) ? items[i] : value;
			}
			json.push(row);
		}
		
		var result = JSON.stringify(json, null, 2);
		$json.removeClass('error').val(result);
	});
};