/*
 * CSVJSON Application - JSON to CSV
 *
 * Copyright (c) 2016 Martin Drapeau
 */
 APP.json2csv = function() {

  var uploadUrl = '/json2csv/upload',
  sepMap = {
    comma: ',',
    semiColon: ';',
    tab: '\t'
  },
  $file = $('#fileupload'),
  $separator = $('select[name=separator]'),
  $json = $('#json'),
  $result = $('#result'),
  $clear = $('#clear, a.clear'),
  $convert = $('#convert, a.convert'),
  $flatten = $('#flatten'),
  $output_csvjson_variant = $('#output_csvjson_variant');
  
  $convert.click(function(e) {
    e.preventDefault();
    
    var json = _.trim($json.val());
    if (json.length == 0) {
      APP.reportError($result, 'Please upload a file or type in something.');
      return false;
    }

    var options = {
      separator: sepMap[$separator.find('option:selected').val()],
      flatten: $flatten.is(':checked'),
      output_csvjson_variant: $output_csvjson_variant.is(':checked')
    };
    
    var data, result;
    try {
      var data = jsonlint.parse(json);
    } catch (error) {
      APP.reportError($result, "Invalid JSON.\n\n" + error);
      return false;
    }
    try {
      result = CSVJSON.json2csv(data, options);
    } catch (error) {
      APP.reportError($result, error + "\n\nOH NO! I don't know how to convert that. Help me understand what you want. Click on the button below to report a bug or suggestion.");
      return false;
    }
    
    $result.removeClass('error').val(result).change();
  });
  
  APP.start({
    $convert: $convert,
    downloadFilename: 'csvjson.csv',
    downloadMimeType: 'text/plain',
    $clear: $clear,
    $saveElements: $('input.save, textarea.save'),
    upload: {
      $file: $file,
      url: uploadUrl,
      $textarea: $result
    }
  });
};