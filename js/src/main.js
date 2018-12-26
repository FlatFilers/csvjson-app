/*
 * CSVJSON Application - Main file - where everything starts
 *
 * Copyright (c) 2014 Martin Drapeau
 */
$(document).ready(function() {
	
	// Load Underscore String
	_.mixin(s.exports());
	
	// Global Singleton object APP was created inline via PHP. It contains:
	//   - page: The module name, and function name to load that module.
	//   - version: APP application version.
	//   - id: If persisted, the session id.
	//   - data: If persisted, the data fetched from the server.
	// Here we extend it with helper functions and load the module for this page.
	_.extend(APP, {
		
		// To be called by the module passing:
		//  - $convert: Convert buttons to be bound.
		//  - $clear: Clear buttons to be bound.
		//  - $saveElements: Elements to persist when saving.
		//  - editor: CodeMirror editor. Optional.
		//  - upload: Hash of elements to handle upload. Must contain:
		//    - $file: Upload button element
		//    - url: Upload URL.
		//    - $textarea: Element to drop the content in. Optional is editor is passed.
		//    - editor: CodeMirror editor. Optional if $textarea is passed.
		start: function(options) {
			options || (options = {});
			
			// Bind elements
			APP.bindDownload();
			APP.bindCopy();
			APP.bindIssue();
			$('a.save-permalink').on('click', APP.onClickSave);
			if (options.upload) {
				if (!options.upload.$file) throw "Invalid option 'upload'. Missing $file.";
				if (!options.upload.url) throw "Invalid option 'upload'. Missing url.";
				if (!options.upload.$textarea && !options.upload.editor) throw "Invalid option 'upload'. Missing $textarea or editor.";
				APP.bindFileUploadToFillTextarea(options.upload.$file, options.upload.url, options.upload.$textarea, options.upload.editor);
			}
			if (options.$convert) APP.bindConvert(options.$convert);
			if (options.$clear) APP.bindClear(options.$clear);
			if (options.$saveElements) APP.setInputsForSave(options.$saveElements);

			// Cache inputs as the user changes them so they remain upon next page load
			$('.container').CacheInputs({
				key: APP.page,
				ignoreOnStart: !!APP.id
			});
			
			// Restore if parmalink, or bind save
			if (APP.id) {
				if (APP.data_url) {
					$.getJSON(APP.data_url).done(function(data) {
						APP.data = data;
						APP.restore(options.editor);
					});
				} else {
					APP.restore(options.editor);
				}
			} else {
				APP.renderSave('active');
			}
		},
		
		// Returns the URL of the page, <domain>/<page>.
		// Excludes any persisted id.
		baseUrl: function() {
			return window.location.protocol + '//' + window.location.hostname + (window.location.port == 80 ? '' : (':' + window.location.port)) + '/' + APP.page;
		},
	
		// Reports an error in the 'result' textarea
		reportError: function($textarea, error) {
			$textarea.addClass('error').val(error);
		},
		
		// Binds the clear button to clear textareas
		bindClear: function($clear) {
			$clear.click(function(e) {
				e.preventDefault();
				ga('send', 'event', '_trackEvent', APP.page, 'clear');
				$('textarea.input, textarea.result').val('').removeClass('error').change();
				APP.renderSave('active');
				return false;
			});
		},
		
		bindConvert: function($convert) {
			$convert.click(function(e) {
				ga('send', 'event', '_trackEvent', APP.page, 'convert');
				APP.renderSave('active');
			});
		},
		
		// Binds the file upload button to dump in the content of the file in the
		// textarea or CodeMirror editor
		bindFileUploadToFillTextarea: function($file, uploadUrl, $textarea, editor) {
			var $fileLabel = $file.siblings('label');
			var fileLabelHtml = $fileLabel.html();
			
			$file.fileupload({
				url: uploadUrl,
				pasteZone: null,
				progress: function(e, data) {
					var progress = parseInt(data.loaded / data.total * 100, 10);
					$fileLabel.text(progress+'%');
				},
				success: function(result) {
					$fileLabel.html(fileLabelHtml);
					if (editor) {
						editor.setValue(result);
					} else {
						$textarea.val(result).change();
					}
				},
				fail: function(e, data) {
					$fileLabel.html(fileLabelHtml);
					// Show an error god damn it!
				}
			});
		},

		bindDownload: function() {
			var $textarea = $('textarea.result'),
				$download = $('a#download'),
				$label = $('a#download').next('em'),
				nodata = 'No data to download. Convert first. ',
				toolarge = 'Too large to download. Copy to clipboard instead. ',
				copypaste = 'Ctrl + A then Ctrl + C to copy to clipboard. ';
			$textarea.change(function() {
				var data = escape($textarea.val());
				$download.attr('href', 'data:application/json;charset=utf-8,' + data);
				$download.attr('title', 'Download result in csvjson.json');
				$label.text(copypaste);
				if (data && data.length < 65400) {
					$download.removeAttr('disabled');
				} else {
					$download.attr('disabled', 'disabled');
					$download.attr('title', nodata);
					$label.text(nodata + copypaste)
					if (data.length) {
						$download.attr('title', toolarge);
						$label.text(toolarge + copypaste);
					}
				}
			});
			$textarea.change();
		},

		bindCopy: function() {
			var $textarea = $('textarea.result'),
			$copy = $('a#copy');
			$copy.on('click', function(e) {
				e.preventDefault();
				$textarea[0].select();
				document.execCommand('copy');
			});
		},
		
		// Sets which inputs will be persisted when saved as a permalink
		$inputsForSave: [],
		setInputsForSave: function($inputs) {
			APP.$inputsForSave = $inputs;
			APP.$inputsForSave.change(function(e) {
				APP.renderSave('active');
			});
		},
		
		// Create a permalink - save this page
		onClickSave: function(e) {
			e.preventDefault();
			if ($('a.save-permalink').closest('li').hasClass('disabled')) return false;
			APP.save();
		},
		save: function() {
			ga('send', 'event', '_trackEvent', APP.page, 'save');
			
			var url = APP.baseUrl() + '/save';
			if (APP.id) url += '/' + APP.id;
			
			var data = {};
			APP.$inputsForSave.each(function() {
				var $el = $(this),
					id = $el.attr('id'),
					value = $el.is('input[type=radio], input[type=checkbox]') ? $el.is(':checked') : $el.val();
				data[id] = value;
			});
			
			APP.renderSave('saving');
			
			// Send as JSON. Expect the id on success.
			return $.ajax(url, {
				type : 'POST',
				data : JSON.stringify(data),
				contentType : 'application/json'
			})
			.done(function(data) {
				APP.id = data.id;
				var newUrl = APP.baseUrl() + '/' + data.id;
				if (window.location.href != newUrl) {
					if (window.history && window.history.pushState)
						window.history.pushState("", "", newUrl);
					else
						window.location.href = newUrl;
				}
				APP.renderSave('saved');
			})
			.fail(function(xhr) {
				var error = xhr.responseText ? xhr.responseText : 'Unexpected error saving.';
				APP.renderSave('error', error);
			});
		},
		
		// Restore a saved session - revive inputs and textareas
		// If CodeMirror editor is passed, textarea.result's value will be stored in it
		restore: function(editor) {
			if (!APP.data) return;
			
			_.each(APP.data, function(value, id) {
				var $el = $('#' + id);
				if (!$el.length) return true;
				
				if ($el.is('input[type=radio], input[type=checkbox]')) {
					if (value) $el.attr('checked', 'checked');
				} else {
					if ($el.is('textarea.result') && editor) {
						editor.setValue(value);
					} else {
						$el.val(value);
					}
				}
				$('textarea.result').change();
			});
			
			APP.renderSave('saved');
		},
		
		// Render the Save link and bind proper action
		renderSave: function(state, error) {
			var $save = $('a.save-permalink');
			
			switch (state) {
				case 'active':
					if ($save.hasClass('active')) return;
					$save
						.html('<i class="glyphicon glyphicon-link"></i> Save')
						.attr('title', 'Save a permanent link to come back later, or to share with a colleague.' + (APP.id ? ' Will overwrite your previous work.' : ''))
						.closest('li').removeClass('disabled');
					break;
				case 'saving':
					$save
						.html('<i class="glyphicon glyphicon-arrow-down"></i> Save')
						.attr('title', 'Please wait...')
						.closest('li').addClass('disabled');
				case 'saved':
					$save
						.html('<i class="glyphicon glyphicon-link"></i> Saved')
						.attr('title', 'Copy the URL in the address bar to share, or bookmark it to save for later.')
						.closest('li').addClass('disabled');
					break;
				case 'error':
					$save
						.html('<i class="glyphicon glyphicon-warning-sign"></i> Error saving')
						.attr('title', error ? error : 'An unexpected error while saving.')
						.closest('li').addClass('disabled');
					break;
			}
		},

		bindIssue: function() {
			var $issue = $('a#issue'),
					template = _.template([
						'<p>1. Save your test case (click on <span class="bg-red"><i class="glyphicon glyphicon-link"></i> Save</span> in navbar). Copy the URL to the clipboard.</p>',
						'<p>2. <a href="https://github.com/martindrapeau/csvjson-app/issues" target="_blank">Consult issues on Github.</a> If you find an existing issue matching yours, please comment and paste the URL of your test case.</p>',
						'<p>3. If you do not find an existing issue, create one by clicking on this button: <a id="github-issue" class="btn btn-xs btn-primary" href="https://github.com/martindrapeau/csvjson-app/issues/new?body=<%=encodeURIComponent(url)%>" target="_blank">Create an issue in Github</a></p>'
					].join(' '));
			$issue.click(function(e) {
				e.preventDefault();
			});
			$issue.popover({
				html: true,
				placement: "top",
				content: function() {
					return template({url: window.location.href});
				}
			});
		}
	});

	// Hide popovers when clicking outside.
	// Source: https://stackoverflow.com/questions/11703093/how-to-dismiss-a-twitter-bootstrap-popover-by-clicking-outside
	$('body').on('click', function (e) {
	    $('[data-toggle="popover"]').each(function () {
	        if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
	            $(this).popover('hide');
	        }
	    });
	});
		
	// Load the proper JS module for this page.
	// Each module extended APP with a function of its page name.
	if (APP.run) {
		var fn = APP[APP.page];
		if (typeof(fn) !== 'function') throw "Module "+APP.page+" not found.";
		APP[APP.page]();
	}
});