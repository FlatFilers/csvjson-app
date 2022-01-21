<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * JSON Beautifier controller
 *
 * Copyright (c) 2022 Flatfile
 *
 */

class Json_beautifier extends MY_Controller {
	
	public function __construct() {
		parent::__construct();
		
		$this->page = 'json_beautifier';
		$this->title = 'JSON Beautifier';
		$this->description = 'Online tool for validating, formatting and beautifying JSON.';
		$this->view = 'json_beautifier_view';
	}
	
}