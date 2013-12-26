<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
|--------------------------------------------------------------------------
| JS and CSS bundling and minifying
|--------------------------------------------------------------------------
|
| js_assets config is a map between a bundled & minified JS file to a list
| of unminified JS files. In development, the unminified files are all
| loaded. In production, only the bundled & minified version is loaded.
|
| Files must include the directory in which they are to be found and
| generated. FCPATH will be prefixed. For example js/myapp.min.js or
| js/jquery.js.
|
| 
|
*/

// Version of things
define('VERSION_FILE', FCPATH."js/src/version");
define('VERSION', file_get_contents(VERSION_FILE));

$config['js_assets'] = array(
	'js/csvjson.min.js' => array(
		'js/jQuery-File-Upload/js/vendor/jquery.ui.widget.js',
		'js/jQuery-File-Upload/js/jquery.iframe-transport.js',
		'js/jQuery-File-Upload/js/jquery.fileupload.js',
		'js/underscore/underscore.js',
		'js/underscore/underscore.string.js',
		'js/json/jsonlint.js',
		'js/src/json3.js',
		'js/src/csv2json.js',
		'js/src/json_beautifier.js',
		'js/src/jquery.cache-inputs.js',
		'js/src/main.js'
	)
);

// TO DO CSS assets...

/* End of file assets.php */
/* Location: ./application/config/assets.php */