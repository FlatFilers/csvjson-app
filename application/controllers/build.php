<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Build extends CI_Controller {
	
	public function __construct() {
		parent::__construct();
		if (ENVIRONMENT == 'production') show_404();
		//$this->output->enable_profiler(TRUE);
	}
	
	public function index() {
		echo "Minifying Javascript Files...<br/>";
	
		// Increase the version number by 0.001
		$contents = file_get_contents(FCPATH.'js/version.js');
		if ($contents === FALSE) {
			echo "Error trying to read version.js file!";
			return;
		}
		$old_version = '';
		$new_version = '';
		$output = '';
		$a = explode("\n",$contents);
		foreach ($a as $line) {
			$line = trim($line);
			if (strpos($line, 'window.csvjsonVersion') === 0) {
				$words = explode('=', $line);
				if (count($words) != 2) {
					echo "Invalid version.js file! Found window.csvjsonVersion but not equal sign!";
					return;
				}
				$old_version = trim(str_replace(';', '', $words[1]));
				if (!is_numeric($old_version)) {
					echo "Invalid version.js file! Found version '$old_version' but it is not a number!";
					return;
				}
				$new_version = $old_version + 0.001;
				$line = "window.csvjsonVersion = $new_version;";
			}
			$output .= $line."\n";
		}
		$write_result = file_put_contents(FCPATH.'js/version.js', $output);
		if ($write_result === FALSE) {
			echo "Error trying to write version.js file!";
			return;
		}
		echo "Version: $new_version<br/>";
		flush();
		
		$file = 'csvjson.min.js';
		$result = $this->buildJS($file, array(
			'jQuery-File-Upload/js/vendor/jquery.ui.widget.js',
			'jQuery-File-Upload/js/jquery.iframe-transport.js',
			'jQuery-File-Upload/js/jquery.fileupload.js',
			'underscore.js',
			'underscore.string.js',
			'json/json3.js',
			'csv2json.js',
			'json_beautifier.js',
			'main.js'
		));
		if ($result === FALSE) {
			echo "Error building $file<br/>";
			echo $result;
			return;
		}
		echo "$file ".$result." bytes<br/>";
	}
	
	private function buildJS($output_file, $files, $comment_file='') {
		$this->load->library('jsmin');
		
		$fid = fopen(FCPATH.'js/'.$output_file, 'w');
		if (!empty($comment_file)) {
			$comment = file_get_contents(FCPATH.'js/'.$comment_file);
			fwrite($fid, $comment."\n");
		}
		foreach ($files as $file) {
			$contents = file_get_contents(FCPATH.'js/'.$file);
			if ($contents === FALSE) {
				echo "Crap - couldn't load file: ".$file;
				fclose($fid);
				return;
			}
			$comment = "// ".$file;
			fwrite($fid, $comment."\n");
			fwrite($fid, $this->jsmin->minify($contents)."\n");
		}
		fclose($fid);
		return filesize(FCPATH.'js/'.$output_file);
	}
}