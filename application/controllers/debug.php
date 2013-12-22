<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Debug extends CI_Controller {
	
	public function __construct() {
		parent::__construct();
		if (ENVIRONMENT == 'production') show_404();
		//$this->output->enable_profiler(TRUE);
	}
	   
	public function index() {
		show_404();
	}
	
	public function info() {
		echo "Environment: ".ENVIRONMENT."<br/>";
		echo "base_url(): ".base_url()."<br/>";
		echo "IS_CLI: ".(IS_CLI?'YES':'NO')."<br/>";
		echo "Background jobs allowed: ".($this->background->allowed()?'YES':'NO')."<br/>";
		
		error_reporting(E_ALL ^ E_NOTICE);
		$errLvl = error_reporting(); 
		for ($i = 0; $i < 15;  $i++ ) { 
			echo $this->FriendlyErrorType($errLvl & pow(2, $i)) . "<br>"; 
		}
		
		phpinfo();
	}
			
	function server() {
		var_dump($_SERVER);
	}
		
	function log($date=NULL) {
		$time = NULL;
		if (empty($date) || $date == 'today') {
			$time = $this->common->getTime();
			$date = date('Y-m-d', $time);
		} else {
			$time = strtotime($date);
			if ($time === FALSE) {
				echo "Invalid date: $date";
				return;
			}
		}
		
		// Find log file
		$config =& get_config();
		$log_path = ($config['log_path'] != '') ? $config['log_path'] : APPPATH.'logs/';
		$log_file = $log_path.'log-'.date('Y-m-d', $time).EXT;
		
		echo '<h1>'.$log_file.'</h1>';
		if (!file_exists($log_file)) {
			echo '<p style="color:red;">Log file does not exist!</p><br/>';
			return;
		}
		
		$str = file_get_contents($log_file);
		echo nl2br($str);
	}
		
}
