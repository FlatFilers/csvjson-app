/*
 * CSVJSON Application - JSON to CSV
 *
 * Copyright (c) 2016 Martin Drapeau
 */
APP.json2csv = function() {
	
	var uploadUrl = '/json2csv/upload',
  		sepMap = {
  			comma: ',',
  			semiColon: ';',
  			tab: '\t'
  		},
  		$file = $('#fileupload'),
  		$separator = $('select[name=separator]'),
      $json = $('#json'),
  		$result = $('#result'),
  		$clear = $('#clear, a.clear'),
  		$convert = $('#convert, a.convert'),
      $flatten = $('#flatten');
	
	$convert.click(function(e) {
		e.preventDefault();
		
		var json = _.trim($json.val());
		if (json.length == 0) err(errorEmpty);
		
		var options = {
			separator: sepMap[$separator.find('option:selected').val()],
      flatten: $flatten.is(':checked')
		};
		
		var result;
		try {
			result = CSVJSON.json2csv(json, options);
		} catch (error) {
			APP.reportError($result, error);
			return false;
		}
		
		$result.removeClass('error').val(result).change();
	});
	
	APP.start({
		$convert: $convert,
		$clear: $clear,
		$saveElements: $('input.save, textarea.save'),
		upload: {
			$file: $file,
			url: uploadUrl,
			$textarea: $result
		}
	});
};