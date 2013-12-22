<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

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
	
}