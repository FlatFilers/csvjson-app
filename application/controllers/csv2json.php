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
	
	function _remap($method, $params) {
		if (is_callable(array($this, $method)))
			return call_user_func_array(array($this, $method), $params);
		return $this->index();
	}
	
	public function index($id=NULL) {
		$data = array();
		if ($id !== NULL) {
			$data = restoreFromDisk($id);
			if (!is_array($data)) $data = array();
		}
		
		$this->load->view('page', array(
			'page' => 'csv2json',
			'title' => 'CSV to JSON',
			'description' => 'Online tool for converting CSV to JSON',
			'data' => $data,
			'view' => 'csv2json_view'
		));
	}
	
	public function upload() {
		$result = uploadFileIsValid('file');
		if ($result !== TRUE) {
			header('HTTP/1.1 400 Bad Request', true, 400);
			log_message('error', $result);
		}
		
		echo file_get_contents($_FILES['file']['tmp_name']);
	}
	
	// AJAX call to persist and create a permalink
	public function save() {
		
	}
	
}