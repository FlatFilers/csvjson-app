CSVJSON
=======

CSVJSON is...

1.  Various tools that as a programmer I use now an then. Like converting CSV to JSON, or formatting JSON and making it pretty. More tools to come as I build as I go.
2.  A PHP CodeIgniter Boilerplate I use for my own apps. Includes JS/CSS bundling and minification.
3.  A clean and simple example of building an application with CodeIgniter.


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

Bundles are compiled in the Build controller (`application/controllers/build.php`). To perform a build, simply call the controller. Javascript bundles get built - minified and concatenated. For example, if you are developing under `localhost`, you would type in a browser
```
http://localhost/build
```

Same principle for CSS assets defined in `$config['css_assets']`.

Special views exist to load the assets. See `application/views/js_assets.php` and `application/views/css_assets.php`. In `production`, these will load the built assets (.min.js). In `development`, all Javascript and CSS files get loaded. To load your assets, add these lines of code in the `HEAD` section of your HTML page:
```
<?php $this->load->view('css_assets'); ?>		
<?php $this->load->view('js_assets'); ?>
```


VERSION
-------

Assets in production are post-fixed with a cache buster query string like `?v=123` where 123 is the version of your application. There is a text file `js/src/version` which contains that number, and is loaded in `confi/assets.php` to set constant `VERSION`. That number is automatically increased by 0.001 when you perform a build.

FAQ
===

Q: What performs minification?<br/>
A: Javascript minification is done with a PHP implmentation of Douglas Crockford's JSMin. See `application/libraries/jsmin.php` for details. CSS minification comes from http://code.google.com/p/minify/. See `application/libraries/cssmin.php`.

Q: Does it perform CSS pre-processing of SASS, LESS or Stylus?<br/>
A: No. Feel free to fork and add it. Would be nice.

