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
	public $tool;
	public $run;
	public $title;
	public $description;
	public $view;
	public $beta;
	public $showSave;
	
	public function __construct() {
		parent::__construct();
		$this->run = true;
		$this->beta = false;
		$this->showSave = true;
	}
	
	// Remap controller to allow passing a parameter to index().
	function _remap($method, $params) {
		if (is_callable(array($this, $method)))
			return call_user_func_array(array($this, $method), $params);
		call_user_func_array(array($this, 'index'), array($method));
	}
	
	public function index($id=NULL) {
		$data = NULL;
		$data_url = NULL;
		if ($id != NULL) {
			if (defined('AWS_S3_URL')) {
				// Client will fetch persisted data from AWS S3
				$data_url = AWS_S3_URL.'data/'.$id;
			} else {
				// Fetch persisted data from disk
				$filename = FCPATH."data/$id";
				if (!file_exists($filename)) {
					show_404();
					return;
				}
				$data = file_get_contents($filename);
			}
		}
		
		$this->load->view('page', array(
			'page' => $this->page,
			'tool' => isset($this->tool) ? $this->tool : $this->title,
			'run' => $this->run,
			'title' => $this->title,
			'beta' => $this->beta,
			'description' => $this->description,
			'id' => $id,
			'data' => $data,
			'data_url' => $data_url,
			'view' => $this->view,
			'showSave' => $this->showSave
		));
	}
	
	public function upload() {
		$result = uploadFileIsValid('file');
		if ($result !== TRUE) {
			set_status_header(400);
			log_message('error', $result);
		}
		
		echo file_get_contents($_FILES['file']['tmp_name']);
	}
	
	// AJAX call to persist and create a permalink. Saves the raw
	// POST body on disk or AWS S3 if available.
	// Returns HTTP code 200 on success, and the id.
	// Returns an HTTP code 400 on error, with the error message.
	public function save($id=NULL) {
		if ($id == NULL) $id = generateUniqueId();
		$data = file_get_contents("php://input");

		if (defined('AWS_S3_URL')) {
			// Persist to AWS S3
			require_once(FCPATH.'application/libraries/s3.php');
			S3::setAuth(AWS_S3_KEY, AWS_S3_SECRET, AWS_S3_REGION);
			S3::putObject($data, AWS_S3_BUCKET, 'data/'.$id, S3::ACL_PUBLIC_READ, array(), array('Content-Type' => 'application/json'));
		} else {
			// Persist to disk
			file_put_contents(FCPATH."data/$id", $data);
		}
		ajaxJsonReply(array('id' => $id));
	}

}