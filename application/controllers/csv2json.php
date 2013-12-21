<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Csv2json extends CI_Controller {
	
	public function __construct() {
		parent::__construct();
	}
	
	public function index() {
		$data = array(
			'page' => 'csv2json',
			'title' => 'CSV to JSON',
			'view' => 'csv2json_view'
		);
		$this->load->view('page_view', $data);
	}
	
	public function upload() {
		if ($_FILES['file']['error'] !== UPLOAD_ERR_OK ||
			!is_uploaded_file($_FILES['file']['tmp_name'])) {
			header('HTTP/1.1 400 Bad Request', true, 400);
			return;
		}
		
		$mime = $this->getMimeType($_FILES['file']['tmp_name']);
		if (!strpos($mime, 'text/plain') === 0) {
			header('HTTP/1.1 400 Bad Request', true, 400);
			log_message('error', 'File upload '.$_FILES['file']['tmp_name']." invalid mime type: $mime");
			return;
		}
		
		echo file_get_contents($_FILES['file']['tmp_name']);
	}
	
	private function getMimeType($file) {
		if (ENVIRONMENT == 'development') return 'text/plain';
		$file = escapeshellarg($file);
		$mime = shell_exec("file -bi " . $file);
		return $mime;
	}
}