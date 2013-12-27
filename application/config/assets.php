<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
|--------------------------------------------------------------------------
| JS and CSS assets - bundling and minifying
|--------------------------------------------------------------------------
|
| js_assets config is a map between a bundled & minified JS file to a list
| of unminified JS files. In DEVELOPMENT, the unminified files are loaded.
| In PRODUCTION, only the bundled/minified version is loaded.
|
| Same principle with css_assets for CSS files.
|
| Production files get appended a query string parameter v=<VERSION> to
| force browser and CDN caching to reload the asset. VERSION is a constant
| set here, loaded from a text file js/src/version. The build
|
| Note: Files must include the directory in which they are to be found and
| generated. FCPATH will be prefixed. For example js/myapp.min.js or
| js/jquery.js.
|
|
| For example:
|
| $config['js_assets'] = array(
|   'js/myapp.min.js' => array(
|     'js/src/main.js',
|     'js/src/utils.js'
|   )
| );
|
| Will produce:
|   /js/myapp.min.js
|
| Composed of these files:
|   /js/src/main.js
|   /js/src/utils.js
|
*/

// Version of things
// Appended as query string to assets to flush out CDNs and browser caches
// when a new version is built.
define('VERSION_FILE', FCPATH."js/src/version");
define('VERSION', file_get_contents(VERSION_FILE));

// Javascript bundles
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

// CSS bundles
$config['css_assets'] = array(
	'css/csvjson.css' => array(
		'css/main.css'
	)
);

/* End of file assets.php */
/* Location: ./application/config/assets.php */