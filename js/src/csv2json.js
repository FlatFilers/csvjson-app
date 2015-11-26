/*
 * CSVJSON Application - CSV to JSON
 *
 * Copyright (c) 2014 Martin Drapeau
 */
APP.csv2json = function() {
	
	var uploadUrl = '/csv2json/upload',
		sepMap = {
			comma: ',',
			semiColon: ';',
			tab: '\t'
		},
		$file = $('#fileupload'),
		$separator = $('input[type=radio][name=separator]'),
		$pivot = $('input[type=checkbox][name=pivot]'),
		$output = $('input[type=radio][name=output]'),
		$csv = $('#csv'),
		$json = $('#json'),
		$clear = $('#clear, a.clear'),
		$convert = $('#convert, a.convert');
	
	$convert.click(function(e) {
		e.preventDefault();
		
		var csv = _.trim($csv.val()),
			separator = $separator.filter(':checked').val(),
			options = {
				pivot: $pivot.is(":checked"),
				hash: $output.filter(':checked').val() == 'hash'
			},
			json;
		if (separator != 'auto') options.separator = sepMap[separator];
		
		try {
			json = CSVJSON.csv2json(csv, options);
		} catch(error) {
			APP.reportError($json, error);
			return false;
		}
		
		var result = JSON.stringify(json, null, 2);
		$json.removeClass('error').val(result);
	});
	
	APP.start({
		$convert: $convert,
		$clear: $clear,
		$saveElements: $('input.save, textarea.save'),
		upload: {
			$file: $file,
			url: uploadUrl,
			$textarea: $csv
		}
	});
};