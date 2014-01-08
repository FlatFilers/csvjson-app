CSVJSON
=======

www.csvjson.com are online formatting and conversion tools that I use as a web developer.
- [CSV to JSON](http://www.csvjson.com/csv2json) : Convert CSV (Excel) to JSON format.
- [JSON Beautifier](http://www.csvjson.com/json_beautifier) : Validate and format JSON. Convert it to Javascript code.
- More to come...

CSVJSON is built using PHP CodeIgniter, Bootstrap 3.0, Underscore, JSON, jsonlint, and other goodies.

Forking welcome: https://github.com/martindrapeau/CSVJSON


Installation
------------

1.  Clone and drop inside a folder under a virtual host using your favorite WAMP or LAMP stack.
2.  Create a `data` directory at the same level as `www`. Saved data for permalinks get stored there.

CodeIgniter's index.php will start everything. If you plan to deploy in a production environment, edit it and change this with your domain name:
```
if (strpos($_SERVER['SERVER_NAME'], "csvjson.com") !== FALSE) {
	define('ENVIRONMENT', 'production');
} else {
	define('ENVIRONMENT', 'development');
}
```

If you use Apache, CSVJSON comes with a .htaccess all ready to go. Blocks remote access of sensible files like this README, .git, etc...


Extending
=========

To add a new tool, follow these steps:

1.  Create a controller (under application/controllers/). Must inherit MY_Controller.
2.  Create a view (under application/views/).
3.  Create a Javascript file (under js/src/).
4.  Create a CSS file (under css) or you can put your CSS directly inside css/main.css.
5.  Update `$config['assets']` located in the `application/config/assets.php` file and add reference to your Javascript and optionally CSS files.

You are then ready to code. In development (ENVIRNOMENT=development), your Javascript and CSS files get loaded.


Deploy for production
---------------------

To deploy for production, you must perform a build. Bundles are compiled in the Build controller (`application/controllers/build.php`). To perform a build, simply call the controller. Javascript bundles get built - minified and concatenated. For example, if you are developing under `localhost`, you would type in a browser
```
http://localhost/build
```
Built assets must then be committed to git. In production, built assets are loaded.


Directory Structure
-------------------
```
--application
  --config
  --controllers
  --views
--system
--js
  --3rd
  --src
--css
```
Directories `application` and `system` are those defined by CodeIgniter. Assets are located under `js` and `css` folders. 3rd party Javascript libraries are under `js/3rd` and application source code (the stuff you write) is under `js/src`. Bundled/minified Javascript files are directly under `js`.


FAQ
===

Q: What if I fund a bug or would like to propose an enhancement? <br/>
A: Report it via GitHub issues: https://github.com/martindrapeau/CSVJSON/issues

Q: What performs minification? <br/>
A: Javascript minification is done with a PHP implmentation of Douglas Crockford's JSMin. See `application/libraries/jsmin.php` for details. CSS minification comes from http://code.google.com/p/minify/. See `application/libraries/cssmin.php`.

Q: Does bundling and minification support CSS pre-processing like SASS, LESS or Stylus? <br/>
A: No. Feel free to fork and add it. Would be nice.

