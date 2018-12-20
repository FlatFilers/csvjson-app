<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSV to JSON Controller
 *
 * Copyright (c) 2014 Martin Drapeau
 *
 */

class Csvjson extends MY_Controller {
	
	public function __construct() {
		parent::__construct();
		
		$this->page = 'home';
		$this->title = 'CSVJSON';
		$this->description = 'Online Conversion Tools for Developers. CSV, JSON, SQL and Javascript.';
		$this->view = 'home_view';
		$this->showSave = false;
	}
	
}