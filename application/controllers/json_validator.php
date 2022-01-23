<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * JSON Beautifier controller
 *
 * Copyright (c) 2022 Flatfile
 *
 */

class Json_validator extends MY_Controller {
  
  public function __construct() {
    parent::__construct();
    
    $this->page = 'json_validator';
    $this->title = 'JSON Validator';
    $this->description = 'Online tool to validate, formatand beautify JSON.';
    $this->view = 'json_validator_view';
  }
  
}