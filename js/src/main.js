/*
 * CSV JSON main file - where everything starts
 *
 * Copyright (c) 2014 Martin Drapeau
 */
$(document).ready(function() {
	
	// Load Underscore String
	_.mixin(_.str.exports());
	
	// Global CSVJSON was created in the page. Extend it with helper
	// functions and load the module for this page.
	
	_.extend(CSVJSON, {
	
		// Reports an error in the 'result' textarea
		reportError: function($textarea, error) {
			$textarea.addClass('error').val(error);
		},
		
		// Binds the clear button on a textarea
		bindClear: function($clear) {
			$clear.click(function(e) {
				e.preventDefault();
				$('textarea.input, textarea.result').val('').removeClass('error');
				return false;
			});
		},
		
		// Binds the file upload button to dump in the content of the file
		// in the textarea
		bindFileUploadToFillTextarea: function($file, uploadUrl, $textarea) {
			var $fileLabel = $file.siblings('label'),
				fileLabelHtml = $fileLabel.html();
			
			$file.fileupload({
				url: uploadUrl,
				progress: function(e, data) {
					var progress = parseInt(data.loaded / data.total * 100, 10);
					$fileLabel.text(progress+'%');
				},
				success: function(result) {
					$fileLabel.html(fileLabelHtml);
					$textarea.val(result);
				},
				fail: function(e, data) {
					$fileLabel.html(fileLabelHtml);
					// Show an error god damn it!
				}
			});
		},
		
		// Sets which inputs will be persisted when saved as a permalink
		$inputsForSave: [],
		setInputsForSave: function($inputs) {
			CSVJSON.$inputsForSave = $inputs;
		},
		
		// Create a permalink - save this page
		save: function() {
			
		}
		
	});
	
	// Cache inputs as the user changes them so they remain upon next page load
	$('.container').CacheInputs({key:CSVJSON.page});
	
	var fn = CSVJSON[CSVJSON.page];
	if (typeof(fn) !== 'function') throw "Module "+CSVJSON.page+" not found.";
	CSVJSON[CSVJSON.page]();
});