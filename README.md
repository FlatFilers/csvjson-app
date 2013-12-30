CSVJSON
=======

CSVJSON is...

1.  Various tools that as a programmer I use now an then. Like converting CSV to JSON, or formatting JSON and making it pretty. More tools to come as I build as I go.
2.  A PHP CodeIgniter Boilerplate I use for my own apps. Includes JS/CSS bundling and minification.

Installation
------------

Clone and drop inside a folder under a virtual host using your favorite WAMP or LAMP stack. CodeIgniter's index.php will start everything.

If you use Apache, comes with a .htaccess all ready to go. Blocks remote access of sensible files like this README, .git, etc...


ENVIRONMENT
-----------

CodeIgniter lets you define a constant called ENVIRONMENT. Can be development, testing or production. To make things simple, index.php sets that variable by looking at the hostname.
```
if (strpos($_SERVER['SERVER_NAME'], "csvjson.com") !== FALSE) {
	define('ENVIRONMENT', 'production');
} else {
	define('ENVIRONMENT', 'development');
}
```
Make sur to change `csvjson.com` to your own domain.


Javascript/CSS Bundling and Minification
----------------------------------------

Bundles are defined in the config file `assets.php` (located under /application/config/). A Javascript bundle is a map `<min file> => [<js file>, <js file>, ...]`. For example, two bundles are defined here:
```
$config['js_assets'] = array(
  'js/3rd.min.js' => array(
    'js/3rd/jquery.js',
    'js/3rd/underscore.js',
    'js/3rd/backbone.js',
  )
	'js/app.min.js' => array(
	  'js/src/file1.js',
	  'js/src/main.js'
	)
);
```

Bundles are compiled in the Build controller (`application/controllers/build.php`). To perform a build, simply call the controller. Javascript bundles get built - minified and concatenated.

Same principle for CSS assets defined in `$config['css_assets']`.

Special views exist to load the assets. See `application/views/js_assets.php` and `application/views/css_assets.php`. In `production`, these will load the built assets (.min.js). In `development`, all Javascript and CSS files get loaded. To load your assets, add these lines of code in the `HEAD` section of your HTML page:
```
<?php $this->load->view('css_assets'); ?>		
<?php $this->load->view('js_assets'); ?>
```

FAQ
===

Q: What performs minification?
A: Javascript minification is done with a PHP implmentation of Douglas Crockford's JSMin. See `application/libraries/jsmin.php` for details. CSS minification comes from http://code.google.com/p/minify/. See `application/libraries/cssmin.php`.

Q: Does it perform CSS pre-processing of SASS, LESS or Stylus?
A: No. Feel free to fork and add it. Would be nice.

