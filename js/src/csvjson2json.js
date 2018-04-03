/*
 * CSVJSON Application - CSV to JSON
 *
 * Copyright (c) 2014 Martin Drapeau
 */
APP.csvjson2json = function() {
  
  var uploadUrl = '/csv2json/upload',
      $file = $('#fileupload'),
      $output = $('input[type=radio][name=output]'),
      $csv = $('#csv'),
      $result = $('#result'),
      $clear = $('#clear, a.clear'),
      $convert = $('#convert, a.convert'),
      $minify = $('#minify');
  
  $convert.click(function(e) {
    e.preventDefault();
    
    var csv = _.trim($csv.val()),
        options = {},
        json;

    try {
      json = CSVJSON.csvjson2json(csv, options);
    } catch(error) {
      APP.reportError($result, error);
      return false;
    }
    
    var result = JSON.stringify(json, null, $minify.is(':checked') ? undefined : 2);
    $result.removeClass('error').val(result).change();
  });
  
  APP.start({
    $convert: $convert,
    $clear: $clear,
    $saveElements: $('input.save, textarea.save'),
    upload: {
      $file: $file,
      url: uploadUrl,
      $textarea: $csv
    }
  });
};