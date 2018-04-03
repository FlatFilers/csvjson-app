<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSV to JSON Controller
 *
 * Copyright (c) 2018 Martin Drapeau
 *
 */

class Csvjson2json extends MY_Controller {
  
  public function __construct() {
    parent::__construct();
    
    $this->page = 'csvjson2json';
    $this->title = 'CSVJSON to JSON';
    $this->description = 'Online tool for converting CSVJSON (CSV format variant) to JSON.';
    $this->view = 'csvjson2json_view';
  }
  
}