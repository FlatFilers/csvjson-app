/*
 * CSV JSON main file - where everything starts
 *
 * Copyright (c) 2014 Martin Drapeau
 */
$(document).ready(function() {
	
	// Load Underscore String
	_.mixin(_.str.exports());
	
	// Global Singleton object CSVJSON was created in the page. Extend it with
	// helper functions and load the module for this page.
	_.extend(CSVJSON, {
		
		init: function() {

			// Cache inputs as the user changes them so they remain upon next page load
			$('.container').CacheInputs({
				key: CSVJSON.page,
				ignoreOnStart: !!CSVJSON.id
			});
			
			// Restore if parmalink, or bind save
			if (CSVJSON.id)
				CSVJSON.restore();
			else
				CSVJSON.renderSave('active');
		},
		
		// Returns the URL of the page, <domain>/<page>.
		// Excludes any persisted id.
		baseUrl: function() {
			return window.location.protocol + '//' + window.location.hostname + '/' + CSVJSON.page;
		},
	
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
		save: function(e) {
			e.preventDefault();
			
			var url = CSVJSON.baseUrl() + '/save';
			if (CSVJSON.id) url += '/' + CSVJSON.id;
			
			var data = {};
			CSVJSON.$inputsForSave.each(function() {
				var $el = $(this),
					id = $el.attr('id'),
					value = $el.is('input[type=radio], input[type=checkbox]') ? $el.is(':checked') : $el.val();
				data[id] = value;
			});
			
			CSVJSON.renderSave('saving');
			
			// Send as JSON. Expect the id on success.
			$.ajax(url, {
				type : 'POST',
				data : JSON.stringify(data),
				contentType : 'application/json'
			})
			.done(function(id) {
				CSVJSON.id = id;
				var newUrl = CSVJSON.baseUrl() + '/' + id;
				if (window.location.href != newUrl) {
					if (window.history && window.history.pushState)
						window.history.pushState("", "", newUrl);
					else
						window.location.href = newUrl;
				}
				CSVJSON.renderSave('saved');
			})
			.fail(function(xhr) {
				var error = xhr.responseText ? xhr.responseText : 'Unexpected error saving.';
				CSVJSON.renderSave('error', error);
			});
			
			return false;
		},
		
		// Restore a saved session - revive inputs and textareas
		restore: function() {
			if (!CSVJSON.data) return;
			
			_.each(CSVJSON.data, function(value, id) {
				var $el = $('#' + id);
				if (!$el.length) return true;
				
				if ($el.is('input[type=radio], input[type=checkbox]')) {
					if (value) $el.attr('checked', 'checked');
				} else {
					$el.val(value);
				}
			});
			
			CSVJSON.renderSave('saved');
		},
		
		// Render the Save link and bind proper action
		renderSave: function(state, error) {
			var $save = $('a.save-permalink');
			
			switch (state) {
				case 'active':
					if ($save.hasClass('active')) return;
					$save
						.unbind().click(CSVJSON.save)
						.html('<i class="glyphicon glyphicon-link"></i> Save')
						.attr('title', 'Save a permanent link to come back later, or share to with a friend.' + (CSVJSON.id ? ' Will overwrite your previous work.' : ''))
						.closest('li').removeClass('disabled');
					break;
				case 'saving':
					$save.unbind('click')
						.html('<i class="glyphicon glyphicon-arrow-down"></i> Save')
						.attr('title', 'Please wait...')
						.closest('li').addClass('disabled');
				case 'saved':
					$save.unbind('click')
						.html('<i class="glyphicon glyphicon-link"></i> Saved')
						.attr('title', 'Copy the URL in the address bar to share, or bookmark it to save for later.')
						.closest('li').addClass('disabled');
					CSVJSON.$inputsForSave.one('change.makedirty', function(e) {
						CSVJSON.renderSave('active');
						CSVJSON.$inputsForSave.unbind('.makedirty');
					});
					break;
				case 'error':
					$save.unbind('click')
						.html('<i class="glyphicon glyphicon-warning-sign"></i> Error saving')
						.attr('title', error ? error : 'An unexpected error while saving.')
						.closest('li').addClass('disabled');
					break;
			}
		}
	});
	
	// Load the proper JS module for this page
	var fn = CSVJSON[CSVJSON.page];
	if (typeof(fn) !== 'function') throw "Module "+CSVJSON.page+" not found.";
	CSVJSON[CSVJSON.page]();
	
	// Start the application
	CSVJSON.init();
});