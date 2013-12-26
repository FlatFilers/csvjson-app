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
	
	// For JSON.parse
	// Converts numbers in strings to pure integers or floats
	function reviver(key, value) {
		var number = value - 0;
		return isNaN(number) ? value : number;
	}
	
	$convert.click(function(e) {
		var space = spaceMap[$('#space').val()],
			dropQuotesOnKeys = $('#drop-quotes-on-keys').is(':checked'),
			dropQuotesOnNumbers = $('#drop-quotes-on-numbers').is(':checked');
		
		var json = _.trim($json.val());
		if (json.length == 0) err(errorEmpty);
		
		var object, result;
		try {
			object = jsonlint.parse(json, dropQuotesOnNumbers ? reviver : null, space);
			result = JSON3.stringify(object, null, space, dropQuotesOnKeys);
			$result.removeClass('error').val(result);
		} catch (error) {
			err(error);
		}
	});
	
};