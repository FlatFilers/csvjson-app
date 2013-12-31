CSVJSON
=======

Online formatting and conversion tools that I use as a web developer.
- CSV to JSON: Convert CSV (Excel) to JSON format.
- JSON Beautifier: Validate and format JSON. Convert it to Javascript code.

CSVJSON is built using PHP CodeIgniter, Bootstrap 3.0, Underscore, JSON, jsonlint, and other goodies.

Forking welcome: https://github.com/martindrapeau/CSVJSON


Installation
------------

Clone and drop inside a folder under a virtual host using your favorite WAMP or LAMP stack. CodeIgniter's index.php will start everything.

If you use Apache, CSVJSON comes with a .htaccess all ready to go. Blocks remote access of sensible files like this README, .git, etc...


Directory Structure
-------------------
```
--application
--system
--js
  --3rd
  --src
--css
```
Directories `application` and `system` are those defined by CodeIgniter. Assets are located under `js` and `css` folders. 3rd party Javascript libraries are under `js/3rd` and application source code (the stuff you write) is under `js/src`. Bundled/minified Javascript files are directly under `js`.


Environment
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

`$config['assets']` is an array of asset bundle records. An asset bundle record contains these attributes:
- type: javascript or css
- output: Name of the output file; minified and concatenated
- files: List of files to bunble
- comment: Comment to include at the begining of the output file. Set to NULL not to write one.

For example:
```
$config['assets'] = array(
  array(
    'type' => JAVASCRIPT,
    'output' => 'js/3rd.min.js',
    'files' => array(
      'js/3rd/jquery.js',
      'js/3rd/underscore.js',
      'js/3rd/backbone.js'
  ),
  array(
    'type' => JAVASCRIPT,
    'output' => 'js/myapp.min.js',
    'files' => array(
      'js/src/main.js',
      'js/src/utils.js'
    ),
    'comment': 'MyApp | (c) 2013'
);
```
Will produce:
```
  /js/3rd.min.js
```
Composed of these files:
```
  /js/3rd/jquery.js
  /js/3rd/underscore.js
  /js/3rd/backbone.js
```
And...
```
  /js/myapp.min.js
```
From:
```
  /js/src/main.js
  /js/src/utils.js
```

Bundles are compiled in the Build controller (`application/controllers/build.php`). To perform a build, simply call the controller. Javascript bundles get built - minified and concatenated. For example, if you are developing under `localhost`, you would type in a browser
```
http://localhost/build
```

A special view exist to load the assets. See `application/views/assets.php`. In `production`, these will load the built assets (.min.js & .min.css). In `development`, all Javascript and CSS files get loaded. To load your assets, add these lines of code in the `HEAD` section of your HTML page:
```
<?php $this->load->view('assets'); ?>
```


Version
-------

Assets in production are post-fixed with a cache buster query string like `?v=123` where 123 is the version of your application. There is a text file `js/src/version` which contains that number, and is loaded in `confi/assets.php` to set constant `VERSION`. That number is automatically increased by 0.001 when you perform a build.

FAQ
===

Q: What if I fund a bug or would like to propose an enhancement? <br/>
A: Report it via GitHub issues: https://github.com/martindrapeau/CSVJSON/issues

Q: What performs minification? <br/>
A: Javascript minification is done with a PHP implmentation of Douglas Crockford's JSMin. See `application/libraries/jsmin.php` for details. CSS minification comes from http://code.google.com/p/minify/. See `application/libraries/cssmin.php`.

Q: Does bundling and minification support CSS pre-processing like SASS, LESS or Stylus? <br/>
A: No. Feel free to fork and add it. Would be nice.

