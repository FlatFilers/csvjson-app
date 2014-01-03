<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSV to JSON Controller
 *
 * Copyright (c) 2014 Martin Drapeau
 *
 */

class Csv2json extends MY_Controller {
	
	public function __construct() {
		parent::__construct();
		
		$this->page = 'csv2json';
		$this->title = 'CSV to JSON';
		$this->description = 'Online tool for converting CSV to JSON';
		$this->view = 'csv2json_view';
	}
	
}