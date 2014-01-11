/*
 * MySQL to JSON
 *
 * Copyright (c) 2014 Martin Drapeau
 */
CSVJSON.mysql2json = function() {

	var errorDetectingSeparator = "We could not detect the separator.",
		errorEmpty = "Please upload a file or type in something.",
		errorEmptyHeader = "Could not detect header. Ensure first row cotains your column headers.";

	var uploadUrl = "/mysql2json/upload";
	
	var $file = $('#fileupload'),
		$separator = $('input[type=radio][name=separator]'),
		$mysql = $('#mysql'),
		$json = $('#json'),
		$clear = $('#clear, a.clear'),
		$convert = $('#convert, a.convert');
	
	CSVJSON.bindFileUploadToFillTextarea($file, uploadUrl, $mysql);
	CSVJSON.bindClear($clear);
	CSVJSON.setInputsForSave($('input.save, textarea.save'));
	
	function err(error) {
		CSVJSON.reportError($json, error);
		return false;
	}
	
	$convert.click(function(e) {
		e.preventDefault();
		var mysql = _.trim($mysql.val());
		if (mysql.length == 0) return err(errorEmpty);
		
		// Remove comments and empty lines, and collapse statemnts on one line
		mysql = mysql
				// Remove comments
				.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '$1')
				.replace(/^--.*[\r\n]/gm, "")
				// Remove empty lines
				.replace(/^\s*[\r\n]/gm, "")
				// Collapse statements (TO DO: Convert this to a single regex)
				.replace(/;\s*[\r\n]/gm, ";;")
				.replace(/[\r\n]/gm, "")
				.replace(/;;/gm, ";\n");
		//$json.val(mysql); return;
		
		var lines = _.lines(mysql);
		if (lines.length == 0) return err(errorEmpty);
		
		// Split into statements
		var tables = {};
		for (var l = 0; l < lines.length; l++) {
			var line = lines[l],
				words = _.words(line);
			if (!words.length) continue;
			
			if (words.length >= 3 &&
				words[0].toUpperCase() == 'CREATE' &&
				words[1].toUpperCase() == 'TABLE') {
				var name = _.trim(words[2], "`'\"");
				tables[name] = {
					header: [],
					values: []
				};
				var matches = _.trim(line.match(/\(([^)]+)\)/), '()');
				// test result
				var values = matches[0].split(',');
				tables[name].header = _.map(values, function(value) {
					return _.trim(value, "`'\"");
				});
			}
			else if (words.length >= 3 &&
				words[0].toUpperCase() == 'INSERT' &&
				words[1].toUpperCase() == 'INTO') {
				var name = _.trim(words[2], "`'\"");
				// test result
				var table = tables[name];
				
				var matches = _.trim(line.match(/\(([^)]+)\)/), '()');
				// test result
				var values = matches[0].split(',');
				tables[name].values.push(_.map(values, function(value) {
					return _.trim(value, "`'\"");
				}));
			}
		}
		$json.val(JSON.stringify(tables, null, 2)); return;
		
		var	json = [];
		
		var result = JSON.stringify(json, null, 2);
		$json.removeClass('error').val(result);
	});
};