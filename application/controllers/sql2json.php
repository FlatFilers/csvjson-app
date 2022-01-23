<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * SQL to JSON controller
 *
 * Copyright (c) 2022 Flatfile
 *
 */

class Sql2json extends MY_Controller {
	
	public function __construct() {
		parent::__construct();
		
		$this->page = 'sql2json';
		$this->title = 'SQL to JSON';
		$this->description = 'Online tool for converting a SQL table or database export to JSON objects.';
		$this->view = 'sql2json_view';
	}
	
}