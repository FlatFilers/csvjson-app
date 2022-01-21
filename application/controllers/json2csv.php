<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSV to JSON Controller
 *
 * Copyright (c) 2022 Flatfile
 *
 */

class Json2csv extends MY_Controller {
	
	public function __construct() {
		parent::__construct();
		
		$this->page = 'json2csv';
		$this->title = 'JSON to CSV';
		$this->description = 'Online tool for converting JSON to CSV or TSV. Convert JSON to Excel.';
		$this->view = 'json2csv_view';
	}
	
}