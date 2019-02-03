/*
 * CSVJSON Application - JSON Beautifier
 *
 * Copyright (c) 2014 Martin Drapeau
 */
 APP.json_beautifier = function() {

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
  
  var $file = $('#fileupload');
  var $json = $('#json');
  var $result = $('#result');
  var $resultNote = $('span.result-note');
  var $clear = $('#clear, a.clear');
  var $convert = $('#convert, a.convert');

  $clear.click(function(e) {
    $resultNote.empty();
  });
  
  $convert.click(function(e) {
    e.preventDefault();
    $resultNote.empty();
    
    var json = _.trim($json.val());
    
    var options = {
      space: spaceMap[$('#space').val()],
      quoteType: $('#quote-type').val(),
      dropQuotesOnKeys: $('#drop-quotes-on-keys').is(':checked'),
      dropQuotesOnNumbers: $('#drop-quotes-on-numbers').is(':checked'),
      inlineShortArrays: $('#inline-short-arrays').is(':checked'),
      inlineShortArraysDepth: parseInt($('#inline-short-arrays-depth').val(), 10),
      minify: $('#minify').is(':checked')
    };
    
    var data;
    try {
      data = jsonlint.parse(json);
    } catch (error) {
      APP.reportError($result, "Invalid JSON.\n\n" + error);
      return false;
    }

    var result;
    try {
      result = CSVJSON.json_beautifier(data, options);
    } catch (error) {
      APP.reportError($result, error);
      $resultNote.text('Invalid JSON');
      return false;
    }
    
    $result.removeClass('error').val(result).change();
    if (options.dropQuotesOnKeys || options.quoteType === 'single') $resultNote.text('Invalid JSON, but valid Javascript');
  });

  
  if (localStorage.csvjsonSavedJSON) {
    $json.val(localStorage.csvjsonSavedJSON);
    delete localStorage.csvjsonSavedJSON;
    _.defer(function() {
      $convert.first().click();
    });
  }
  
  APP.start({
    $convert: $convert,
    $clear: $clear,
    $saveElements: $('input.save, textarea.save, select.save'),
    upload: {
      $file: $file,
      url: uploadUrl,
      $textarea: $json
    }
  });
};
