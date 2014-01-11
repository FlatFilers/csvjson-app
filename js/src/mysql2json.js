/*
 * MySQL to JSON
 *
 * Copyright (c) 2014 Martin Drapeau
 */
CSVJSON.mysql2json = function() {

	var errorEmpty = "Please upload a file or type in something.";

	var uploadUrl = "/mysql2json/upload";
	
	var $file = $('#fileupload'),
		$format = $('input[type=radio][name=format]'),
		$mysql = $('#mysql'),
		$result = $('#result'),
		$clear = $('#clear, a.clear'),
		$convert = $('#convert, a.convert');
	
	CSVJSON.bindFileUploadToFillTextarea($file, uploadUrl, $mysql);
	CSVJSON.bindConvert($convert);
	CSVJSON.bindClear($clear);
	CSVJSON.setInputsForSave($('input.save, textarea.save'));
	
	function err(error) {
		CSVJSON.reportError($result, error);
		return false;
	}
	
	$convert.click(function(e) {
		e.preventDefault();
		var mysql = _.trim($mysql.val());
		if (mysql.length == 0) return err(errorEmpty);
		
		var format = $format.filter(':checked').val();
		
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
		//$result.val(mysql); return;
		
		var lines = _.lines(mysql);
		if (lines.length == 0) return err(errorEmpty);
		
		// Split into tables
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
				var values = _(line).chain().strRight("(").strLeftBack(")").words(",").value();
				tables[name].header = _.reduce(values, function(result, value) {
					var words = _.words(value);
					// TO DO: test
					var first = _.trim(words[0]);
					if (_.startsWith(first, "'") || _.startsWith(first, "`") || _.startsWith(first, '"'))
						result.push(_.trim(first, "`'\""));
					return result;
				}, []);
			}
			else if (words.length >= 3 &&
				words[0].toUpperCase() == 'INSERT' &&
				words[1].toUpperCase() == 'INTO') {
				var name = _.trim(words[2], "`'\"");
				// TO DO: test
				var table = tables[name];
				var values = _(line).chain().strRight("(").strLeftBack(")").words(",").value();
				tables[name].values.push(_.map(values, function(value) {
					return _.trim(value, " `'\"");
				}));
			}
		}
		//$result.val(JSON.stringify(tables, null, 2)); return;
		
		// Convert to json now
		var	json = {};
		_.each(tables, function(table, name) {
			var keys = table.header;
			json[name] = _.map(table.values, function(values) {
				var o = {};
				for (var k=0; k < keys.length; k++)
					o[keys[k]] = values[k];
				return o;
			});
		});
		
		// Output requested format
		var result = '';
		if (format == "json")
			result = JSON.stringify(json, null, 2);
		else
			result = _.reduce(json, function(result, table, name) {
				return result + "var " + name + " = " + JSON.stringify(table, null, 2) + ";\n";
			}, '');
		
		$result.removeClass('error').val(result);
	});
};