<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * JSON Beautifier controller
 *
 * Copyright (c) 2014 Martin Drapeau
 *
 */

class Json_beautifier extends CI_Controller {
	
	public function __construct() {
		parent::__construct();
	}
	
	public function index() {
		$data = array(
			'page' => 'json_beautifier',
			'title' => 'JSON Beautifier',
			'description' => 'Online tool for formatting JSON',
			'view' => 'json_beautifier_view'
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