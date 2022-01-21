/*
 * CSVJSON Application - JSON Validator
 *
 * Copyright (c) 2022 Flatfile
 */
APP.json_validator = function() {

  function nl2br (str, is_xhtml) {   
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';    
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
  }
  
  var uploadUrl = "/json_validator/upload";
  var $file = $('#fileupload');
  var $json = $('#result');
  var $status = $('#status');
  var $clear = $('#clear, a.clear');
  var $convert = $('#convert, a.convert');
  var editor = CodeMirror.fromTextArea($json[0], {
    lineNumbers: true,
    mode: "application/json",
    gutters: ["CodeMirror-lint-markers"],
    lint: true
  });

  editor.on('update', function() {
    var value = editor.getValue() || '';
    $json.val(value).change();

    var lineErrors = [];
    JSHINT(value);
    for (var i = 0; i < JSHINT.errors.length; ++i) {
      var err = JSHINT.errors[i];
      if (!err) continue;
      if (lineErrors.indexOf(err.line) === -1) lineErrors.push(err.line);
    }

    if (lineErrors.length) {
      var msg = 'Error on line ';
      if (lineErrors.length > 1) msg = 'Errors on lines: ';
      $status.removeClass('alert-default alert-success alert-info').addClass('alert-danger').html(msg + lineErrors.join(', '));
    } else if (value.trim().length == 0) {
      $status.removeClass('alert-success alert-danger alert-info').addClass('alert-default').empty();
    } else {
      var msg = 'JSON valid. Need more formatting options? Try <a class="beautify" href="/json_beautifier">JSON Beautifier</a>.';
      $status.removeClass('alert-default alert-danger alert-info').addClass('alert-success').html(msg);
    }
  });

  $status.on('click', 'a.beautify', function(e) {
    e.preventDefault();
    localStorage.csvjsonSavedJSON = editor.getValue();
    window.location = $(this).attr('href');
  });

  $clear.click(function(e) {
    editor.setValue('');
  });
  
  $convert.click(function(e) {
    e.preventDefault();
    
    var json = _.trim(editor.getDoc().getValue());
    
    var options = {
      inlineShortArrays: true,
      inlineShortArraysDepth: 2
    };
    
    var result;
    try {
      result = CSVJSON.json_beautifier(json, options);
    } catch (error) {
      var message = error.message || 'Missing JSON';
      $status.removeClass('alert-default alert-success alert-info').addClass('alert-danger').html(nl2br(message));
      return false;
    }

    editor.getDoc().setValue(result);
  });
  
  APP.start({
    $convert: $convert,
    $clear: $clear,
    $saveElements: $('input.save, textarea.save, select.save'),
    editor: editor,
    upload: {
      $file: $file,
      url: uploadUrl,
      editor: editor
    }
  });
};
