# CSVJSON

www.csvjson.com are online formatting and conversion tools that I use as a developer.

- [CSV to JSON](https://www.csvjson.com/csv2json): Convert CSV (Excel) to JSON format.
- [JSON to CSV](https://www.csvjson.com/json2csv): Convert JSON to CSV format (Excel).
- [SQL to JSON](https://www.csvjson.com/sql2json): Convert SQL (CREATE TABLE and INSERT INTO statements) to JSON format.
- [JSON Validator](https://csvjson.com/json_validator): Cerifies that your JavaScript Object Notation adheres to the JSON specification.
- [JSON Beautifier](https://www.csvjson.com/json_beautifier): Format and make beautiful JSON. Convert it to JavaScript code (drop quotes on keys).
- [Data Janitor](https://www.csvjson.com/datajanitor): Online tool for Excel and Google Sheets data cleaning and transformation using user-written JavaScript.
- More to come...

CSVJSON is built using PHP CodeIgniter, Bootstrap 3.0, Underscore, JSON, jsonlint, and other goodies.

Forking welcome: https://github.com/martindrapeau/csvjson-app

## Installation

1. Clone and drop inside a folder under a virtual host using your favorite WAMP or LAMP stack.
2. Create a `data` directory at the same level as `www`. Saved data for permalinks get stored there.
3. Create file application/config/aws_s3.php and paste this into it:

```php
if (!defined('BASEPATH')) exit('No direct script access allowed');
$config['aws_s3'] = array('supported' => defined('AWS_S3_URL'));
```

CodeIgniter's index.php will start everything. If you plan to deploy in a production environment, edit it and change this with your domain name:

```php
if (strpos($_SERVER['SERVER_NAME'], "csvjson.com") !== FALSE) {
    define('ENVIRONMENT', 'production');
} else {
    define('ENVIRONMENT', 'development');
}
```

If you use Apache, CSVJSON comes with a .htaccess all ready to go. Blocks remote access of sensible files like this README, .git, etc...

## Extending

To add a new tool, best to look at an existing example. For example csv2json. Follow these steps:

1. Create a controller (under application/controllers/). Must inherit MY_Controller.
2. Create a view (under application/views/).
3. Create the conversion JavaScript file (under js/src/csvjson). This file will contain your new conversion function on the CSVJSON global.
4. Create the UI JavaScript file (under js/src/). This will drive the UI, and call your conversion function to do the work.
5. Create a CSS file (under css) or you can put your CSS directly inside css/main.css.
6. Update `$config['assets']` located in the `application/config/assets.php` file and add reference to your JavaScript and optionally CSS files.

You are then ready to code. In development (ENVIRONMENT=development), your JavaScript and CSS files get loaded.

## Deploy for production

To deploy for production, you must perform a build. Bundles are compiled in the Build controller (`application/controllers/build.php`). To perform a build, simply call the controller. JavaScript bundles get built - minified and concatenated.

For example, if you are developing under `localhost`, you would type in a browser http://localhost/build

Built assets must then be committed to Git. In production, built assets are loaded.

## Directory Structure

```
--application
  --config
  --controllers
  --views
--system
--js
  --3rd
  --csvjson
  --src
--css
```

Directories `application` and `system` are those defined by CodeIgniter. Assets are located under `js` and `css` folders. 3rd party JavaScript libraries are under `js/3rd` and application source code (the stuff you write) is under `js/src`. Bundled/minified JavaScript files are directly under `js`.

## AWS S3

Saved sessions are stored in Amazon Web Services Simple Storage.
The following config file must exist, but never be committed and versioned in Git 
application/config/aws_s3.php

```php
if (!defined('BASEPATH')) exit('No direct script access allowed');
if (defined('CURL_SSLVERSION_TLSv1')) {
  define('AWS_S3_KEY', 'XXXX');
  define('AWS_S3_SECRET', 'XXXX');
  define('AWS_S3_REGION', 'us-east-2');
  define('AWS_S3_BUCKET', 'csvjson');
  define('AWS_S3_URL', 'https://s3.'.AWS_S3_REGION.'.amazonaws.com/'.AWS_S3_BUCKET.'/');
}
$config['aws_s3'] = array('supported' => defined('AWS_S3_URL'));
```

## FAQ

Q: What if I fund a bug or would like to propose an enhancement? <br/>
A: Report it via [GitHub issues](https://github.com/martindrapeau/csvjson-app/issues).

Q: What performs minification? <br/>
A: JavaScript minification is done with a PHP implementation of Douglas Crockford's JSMin. See `application/libraries/jsmin.php` for details. CSS minification comes from http://code.google.com/p/minify/. See `application/libraries/cssmin.php`.

Q: Does bundling and minification support CSS pre-processing like SASS, LESS or Stylus? <br/>
A: No. Feel free to fork and add it. Would be nice.
