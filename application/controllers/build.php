<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

// Builds our assets
// TO DO: Minify CSS too

class Build extends CI_Controller {
	
	public function __construct() {
		parent::__construct();
		if (ENVIRONMENT == 'production') show_404();
		//$this->output->enable_profiler(TRUE);
	}
	
	public function index() {
		echo "Minifying Javascript Files...<br/>";
	
		// Increase the version number by 0.001
		$old_version = file_get_contents(VERSION_FILE);
		if ($old_version === FALSE) {
			echo "Error trying to read version file!";
			return;
		}
		$new_version = $old_version + 0.001;
		$write_result = file_put_contents(VERSION_FILE, $new_version);
		if ($write_result === FALSE) {
			echo "Error trying to write version file!";
			return;
		}
		echo "Version: $new_version<br/>";
		flush();
		
		// Create our concatenated and minified JS file
		$file = 'csvjson.min.js';
		$result = $this->buildJS($file, array(
			'jQuery-File-Upload/js/vendor/jquery.ui.widget.js',
			'jQuery-File-Upload/js/jquery.iframe-transport.js',
			'jQuery-File-Upload/js/jquery.fileupload.js',
			'underscore/underscore.js',
			'underscore/underscore.string.js',
			'src/json3.js',
			'src/csv2json.js',
			'src/json_beautifier.js',
			'src/main.js'
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