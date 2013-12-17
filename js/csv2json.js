$(document).ready(function() {

	// Load Underscore String
	_.mixin(_.str.exports());

	var errorDetectingSeparator = "We could not detect the separator.",
		errorEmpty = "Please upload a file to type in something.",
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
		$convert = $('#convert');
	
	function getSeparator(csv) {
		var userSpecified = $separator.find(':checked').val(),
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

	// Set up file upload. Hopefully we don't have to send anything to the server.
	$file.fileupload();
	
	$convert.click(function(e) {
		var csv = _.trim($csv.val());
		if (csv.length == 0) throw errorEmpty;
		
		var separator = getSeparator(csv);
		if (!separator) throw errorDetectingSeparator;
		console.log('separator', separator);
		
		var lines = _.lines(csv);
		if (lines.length == 0) throw errorEmpty;
		
		var keys = _.words(lines.shift(), separator);
		if (keys.length == 0) throw errorEmptyHeader;
		
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
		
		$json.text(JSON.stringify(json, null, 2));
	});
});