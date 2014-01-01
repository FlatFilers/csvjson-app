<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSV to JSON Controller
 *
 * Copyright (c) 2014 Martin Drapeau
 *
 */

class Csv2json extends CI_Controller {
	
	public function __construct() {
		parent::__construct();
	}
	
	public function index() {
		$data = array(
			'page' => 'csv2json',
			'title' => 'CSV to JSON',
			'description' => 'Online tool for converting CSV to JSON',
			'view' => 'csv2json_view'
		);
		$this->load->view('page', $data);
	}
	
	public function upload() {
		$result = uploadFileIsValid('file');
		if ($result !== TRUE) {
			header('HTTP/1.1 400 Bad Request', true, 400);
			log_message('error', $result);
		}
		
		echo file_get_contents($_FILES['file']['tmp_name']);
	}
}