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
		$resultNote = $('span.result-note'),
		$clear = $('#clear, a.clear'),
		$convert = $('#convert, a.convert');
	
	CSVJSON.bindFileUploadToFillTextarea($file, uploadUrl, $json);
	CSVJSON.bindClear($clear);
	$clear.click(function(e) {
		$resultNote.empty();
	});
	CSVJSON.setInputsForSave($('input.save, textarea.save, select.save'));
	
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
					i = start + 1;
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
	
	$convert.click(function(e) {
		e.preventDefault();
		$resultNote.empty();
		
		var space = spaceMap[$('#space').val()],
			dropQuotesOnKeys = $('#drop-quotes-on-keys').is(':checked'),
			dropQuotesOnNumbers = $('#drop-quotes-on-numbers').is(':checked'),
			inlineShortArrays = $('#inline-short-arrays').is(':checked');
		
		var json = _.trim($json.val());
		if (json.length == 0) err(errorEmpty);
		
		var object, result;
		try {
			object = jsonlint.parse(json);
			if (dropQuotesOnNumbers) walkObjectAndDropQuotesOnNumbers(object);
			result = JSON3.stringify(object, null, space, dropQuotesOnKeys);
			if (inlineShortArrays) result = inlineShortArraysInResult(result);
			$result.removeClass('error').val(result);
			if (dropQuotesOnKeys) $resultNote.text('Invalid JSON, but valid Javascript');
		} catch (error) {
			err(error);
			$resultNote.text('Invalid JSON');
		}
	});
	
};