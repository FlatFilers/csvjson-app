/*
 * CSVJSON Application - SQL to JSON
 *
 * Copyright (c) 2014 Martin Drapeau
 */
APP.sql2json = function() {

	var uploadUrl = "/sql2json/upload";
	
	var $file = $('#fileupload'),
		$format = $('input[type=radio][name=format]'),
		$sql = $('#sql'),
		$result = $('#result'),
		$clear = $('#clear, a.clear'),
		$convert = $('#convert, a.convert');
	
	$convert.click(function(e) {
		e.preventDefault();
		
		var sql = _.trim($sql.val());
		if (sql.length == 0) return err(errorEmpty);
		
		var json;
		try {
			json = CSVJSON.sql2json(sql);
		} catch(error) {
			APP.reportError($result, error);
			return false;
		}
		
		// Output requested format
		var format = $format.filter(':checked').val(),
			result = '';
		
		if (format == "json")
			result = JSON.stringify(json, null, 2);
		else
			result = _.reduce(json, function(result, table, name) {
				return result + "var " + name + " = " + JSON.stringify(table, null, 2) + ";\n";
			}, '');
		
		$result.removeClass('error').val(result);
	});
	
	APP.start({
		$convert: $convert,
		$clear: $clear,
		$saveElements: $('input.save, textarea.save'),
		upload: {
			$file: $file,
			url: uploadUrl,
			$textarea: $sql
		}
	});
};