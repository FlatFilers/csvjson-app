<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSVJSON base controller. Every controller tool inherits from this one.
 *
 * Copyright (c) 2014 Martin Drapeau
 *
 */

class MY_controller extends CI_Controller {
	
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
		$data = array();
		if ($id != NULL) {
			$data = restoreFromDisk($id);
			//if (!is_array($data)) $data = array();
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
	
	// AJAX call to persist and create a permalink
	// Returns HTTP code 200 on success, with the id.
	// Returns an HTTP code 400 on error, with the error message.
	public function save($id=NULL) {
		if ($id == NULL) $id = generateUniqueId();
		$result = saveToDisk($id, $_POST);
		if ($result !== TRUE) {
			ajaxReply($result, FALSE);
			return;
		}
		ajaxReply($id);
	}
}