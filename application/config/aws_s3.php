<?php if (!defined('BASEPATH')) exit('No direct script access allowed');
if (defined('CURL_SSLVERSION_TLSv1') && getenv('S3_BUCKET') !== false) {
  define('AWS_S3_KEY', $_ENV['AWS_ACCESS_KEY_ID']);
  define('AWS_S3_SECRET', $_ENV['AWS_SECRET_ACCESS_KEY']);
  define('AWS_S3_REGION', $_ENV['AWS_REGION']);
  define('AWS_S3_BUCKET', $_ENV['S3_BUCKET']);
  define('AWS_S3_URL', 'https://s3.'.AWS_S3_REGION.'.amazonaws.com/'.AWS_S3_BUCKET.'/');
}
$config['aws_s3'] = array('supported' => defined('AWS_S3_URL'));
