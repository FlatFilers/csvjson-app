<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSV to JSON Controller
 *
 * Copyright (c) 2022 Flatfile
 *
 */

class Csv2json extends MY_Controller {
	
	public function __construct() {
		parent::__construct();
		
		$this->page = 'csv2json';
		$this->title = 'CSV to JSON';
		$this->description = 'Online tool for converting CSV to JSON. Convert Excel to JSON. Transpose data. Output array or hash.';
		$this->view = 'csv2json_view';
	}

	public function instrument() {
		$columns = isset($_POST['columns']) ?
			trim($this->security->xss_clean($_POST['columns'])) : null;
		if ($columns == null || empty($columns)) return;

		$num_rows = isset($_POST['num_rows']) && is_numeric($_POST['num_rows']) ?
			$_POST['num_rows'] : 0;

		$this->load->database();
		$this->db->insert('csv', [
			'columns' => $columns,
			'num_rows' => $num_rows,
		]);
	}
	
}