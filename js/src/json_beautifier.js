/*
 * CSVJSON Application - JSON Beautifier
 *
 * Copyright (c) 2014 Martin Drapeau
 */
APP.json_beautifier = function() {
	
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
		$resultNote = $('span.result-note'),
		$clear = $('#clear, a.clear'),
		$convert = $('#convert, a.convert');
	
	$clear.click(function(e) {
		$resultNote.empty();
	});
	
	$convert.click(function(e) {
		e.preventDefault();
		$resultNote.empty();
		
		var json = _.trim($json.val());
		if (json.length == 0) err(errorEmpty);
		
		var options = {
			space: spaceMap[$('#space').val()],
			dropQuotesOnKeys: $('#drop-quotes-on-keys').is(':checked'),
			dropQuotesOnNumbers: $('#drop-quotes-on-numbers').is(':checked'),
			inlineShortArrays: $('#inline-short-arrays').is(':checked')
		};
		
		var result;
		try {
			result = CSVJSON.json_beautifier(json, options);
		} catch (error) {
			APP.reportError($result, error);
			$resultNote.text('Invalid JSON');
			return false;
		}
		
		$result.removeClass('error').val(result);
		if (options.dropQuotesOnKeys) $resultNote.text('Invalid JSON, but valid Javascript');
	});
	
	APP.start({
		$convert: $convert,
		$clear: $clear,
		$save: $('input.save, textarea.save, select.save'),
		upload: {
			$file: $file,
			url: uploadUrl,
			$textarea: $json
		}
	});
};