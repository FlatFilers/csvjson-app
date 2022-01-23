<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSVJSON to JSON Controller
 *
 * Copyright (c) 2022 Flatfile
 *
 */

class Csvjson2json extends MY_Controller {

  public function __construct() {
    parent::__construct();

    $this->page = 'csvjson2json';
    $this->title = 'CSVJSON to JSON';
    $this->description = 'Online tool for converting CSVJSON (a CSV format variant where every value is valid JSON) to JSON.';
    $this->view = 'csvjson2json_view';
  }

}
