<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * MySQL to JSON controller
 *
 * Copyright (c) 2014 Martin Drapeau
 *
 */

class Mysql2json extends MY_Controller {
	
	public function __construct() {
		parent::__construct();
		
		$this->page = 'mysql2json';
		$this->title = 'MySQL to JSON';
		$this->description = 'Online tool for converting a MySQL dump to a JSON object.';
		$this->view = 'mysql2json_view';
	}
	
}