<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
|--------------------------------------------------------------------------
| JS and CSS assets - bundling and minifying
|--------------------------------------------------------------------------
|
| Config assets is an array of asset bundle records. An asset bundle record
| contains these attributes:
|  - type: javascript or css
|  - output: Name of the output file; minified and concatenated
|  - files: List of files to bunble
|  - comment: Comment to include at the begining of the output file. Set
|             to NULL not to write one.
|
| Controller Build (controllers/build.php) performs the bundling and
| minification.
|
| View assets.php will load the assets. In DEVELOPMENT, the unminified files
| get loaded. In PRODUCTION, only the bundled/minified version gets loaded.
|
| Production files get appended a query string parameter v=<VERSION> to
| force browser and CDN caching to reload the asset. VERSION is a constant
| set here, loaded from a text file js/src/version. The build
|
| Note: Files must include the directory in which they are to be found and
| generated. FCPATH will be prefixed. For example js/myapp.min.js or
| js/jquery.js.
|
| Copyright (c) 2014 Martin Drapeau
|
*/

// Version of things
// Appended as query string to assets to flush out CDNs and browser caches
// when a new version is built.
define('VERSION_FILE', FCPATH."js/src/version");
define('VERSION', file_get_contents(VERSION_FILE));

// Types
define('JAVASCRIPT', 'javascript');
define('CSS', 'css');

// Our copyright comment to include in our bundles
$comment = 'CSVJSON | (c) 2013 Martin Drapeau | https://github.com/martindrapeau/csvjson-app';

// Asset bundles
$config['assets'] = array(
	array(
		'type' => CSS,
		'output' => 'css/csvjson.css',
		'files' => array(
			'css/main.css'
		),
		'comment' => $comment
	),
	array(
		'type' => JAVASCRIPT,
		'output' => 'js/3rd.min.js',
		'files' => array(
			'js/3rd/jQuery-File-Upload/js/vendor/jquery.ui.widget.js',
			'js/3rd/jQuery-File-Upload/js/jquery.iframe-transport.js',
			'js/3rd/jQuery-File-Upload/js/jquery.fileupload.js',
			'js/3rd/underscore/underscore.js',
			'js/3rd/underscore/underscore.string.js',
			'js/3rd/json/json2.js'
		)
	),
	array(
		'type' => JAVASCRIPT,
		'output' => 'js/csvjson.min.js',
		'files' => array(
			'js/csvjson/json2-mod.js',
			'js/csvjson/pegjs-csv-parser-mod.js',
			'js/csvjson/jsonlint.js',
			'js/csvjson/csv2json.js',
			'js/csvjson/json2csv.js',
			'js/csvjson/sql2json.js',
			'js/csvjson/json_beautifier.js',
			'js/csvjson/csvjson2json.js'
		)
	),
	array(
		'type' => JAVASCRIPT,
		'output' => 'js/app.min.js',
		'files' => array(
			'js/src/jquery.cache-inputs.js',
			'js/src/csv2json.js',
			'js/src/json2csv.js',
			'js/src/sql2json.js',
			'js/src/json_beautifier.js',
			'js/src/csvjson2json.js',
			'js/src/home.js',
			'js/src/main.js'
		),
		'comment' => $comment
	)
);

/* End of file assets.php */
/* Location: ./application/config/assets.php */