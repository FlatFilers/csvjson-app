<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSV to JSON Controller
 *
 * Copyright (c) 2018 Martin Drapeau
 *
 */

class Dataclean extends MY_Controller {
	
	public function __construct() {
		parent::__construct();
		
		$this->page = 'dataclean';
		$this->title = 'Data Clean <sup>BETA</sup>';
		$this->description = 'Online tool to clean and transform Excel and Google Sheets data.';
		$this->view = 'dataclean_view';
	}
	
}