<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

// Builds our assets
// Also updates the application version
// Uses the Assets configuration (config/assets.php).

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
		foreach ($this->config['js_assets'] as $minFile => $files) {
			$result = $this->buildJs($minFile, $files);
			if ($result === FALSE) {
				echo "Error building $minFile<br/>";
				echo $result;
				return;
			}
			echo "$file ".$result." bytes<br/>";
		}
	}
	
	private function buildJS($output_file, $files, $comment_file='') {
		$this->load->library('jsmin');
		
		$fid = fopen(FCPATH.$output_file, 'w');
		if (!empty($comment_file)) {
			$comment = file_get_contents(FCPATH.$comment_file);
			fwrite($fid, $comment."\n");
		}
		foreach ($files as $file) {
			$contents = file_get_contents(FCPATH.$file);
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
		return filesize(FCPATH.$output_file);
	}
}