<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Csv2json extends CI_Controller {
	
	public function __construct() {
		parent::__construct();
	}
	
	public function index() {
		$this->load->view('csv2json_view');
	}
	
	public function upload() {
		
	}
}