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
			'page' => 'json_beautifier',
			'title' => 'JSON Beautifier',
			'description' => 'Online tool for formatting JSON',
			'data' => $data,
			'view' => 'json_beautifier_view'
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
	// Returns HTTP code 200 on success, with the URL.
	// Returns an HTTP code 400 on error, with the error message.
	public function save($id=NULL) {
		if ($id == NULL) $id = generateUniqueId();
		$result = saveToDisk($id, $_POST);
		if ($result !== TRUE) {
			ajaxReply($result, TRUE);
			return;
		}
		ajaxReply(trim(base_url(), '/').'/json_beautifier/'.$id);
	}
	
}