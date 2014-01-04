<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSVJSON base controller. Every tool controller inherits from this one.
 * Uses helpers in application/helpers/csvjson_helper.php.
 *
 * Copyright (c) 2014 Martin Drapeau
 *
 */

class MY_Controller extends CI_Controller {
	
	public $page;
	public $title;
	public $description;
	public $view;
	
	public function __construct() {
		parent::__construct();
	}
	
	// Remap controller to allow passing a parameter to index().
	function _remap($method, $params) {
		if (is_callable(array($this, $method)))
			return call_user_func_array(array($this, $method), $params);
		call_user_func_array(array($this, 'index'), array($method));
	}
	
	public function index($id=NULL) {
		$data = '';
		if ($id != NULL) {
			$filename = FCPATH."../data/$id";
			if (!file_exists($filename)) {
				show_404();
				return;
			}
			$data = file_get_contents($filename);
		}
		
		$this->load->view('page', array(
			'page' => $this->page,
			'title' => $this->title,
			'description' => $this->description,
			'id' => $id,
			'data' => $data,
			'view' => $this->view
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
	
	// AJAX call to persist and create a permalink. Saves the raw
	// POST body on disk.
	// Returns HTTP code 200 on success, and the id.
	// Returns an HTTP code 400 on error, with the error message.
	public function save($id=NULL) {
		if ($id == NULL) $id = generateUniqueId();
		$data = file_get_contents("php://input");
		file_put_contents(FCPATH."../data/$id", $data);
		ajaxReply($id);
	}
}