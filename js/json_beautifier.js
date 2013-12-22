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
		$fileLabel = $('.fileinput-button>label'),
		fileLabelHtml = $fileLabel.html(),
		$json = $('#json'),
		$result = $('#result'),
		$clear = $('a.clear'),
		$convert = $('#convert');
	
	// Set up file upload. Hopefully we don't have to send anything to the server.
	$file.fileupload({
		url: uploadUrl,
		progress: function(e, data) {
			var progress = parseInt(data.loaded / data.total * 100, 10);
			$fileLabel.text(progress+'%');
		},
		success: function(result) {
			$fileLabel.html(fileLabelHtml);
			$csv.val(result);
		},
		fail: function(e, data) {
			$fileLabel.html(fileLabelHtml);
			// Show an error god damn it!
		}
	});
	
	$clear.click(function(e) {
		e.preventDefault();
		$(this).siblings('textarea').val('');
		return false;
	});
	
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
		if (json.length == 0) throw errorEmpty;
		
		var object = JSON3.parse(json, dropQuotesOnNumbers ? reviver : null, space);
		
		
		var result = JSON3.stringify(object, null, space, dropQuotesOnKeys);
		
		$result.val(result);
	});
	
};