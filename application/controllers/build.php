<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * JavaScript and CSS Bundling and Minification.
 *
 * Copyright (c) 2022 Flatfile
 *
 * Call this to build and minify your assets.
 * Uses the Assets configuration (config/assets.php).
 * Used by view views/assets.php.
 *
 */

class Build extends CI_Controller {

	public function __construct() {
		parent::__construct();
		if (ENVIRONMENT == 'production') show_404();
		//$this->output->enable_profiler(TRUE);
	}

	public function index() {
		echo "Minifying JavaScript Files...<br/>";

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

		// Create our bundle files
		foreach ($this->config->item('assets') as $bundle) {
			if ($bundle['type'] == JAVASCRIPT) {
				$result = $this->buildJs($bundle['output'], $bundle['files'], isset($bundle['comment']) ? $bundle['comment'] : NULL);
			} else if ($bundle['type'] == CSS) {
				$result = $this->buildCss($bundle['output'], $bundle['files'], isset($bundle['comment']) ? $bundle['comment'] : NULL);
			} else {
				echo 'Invalid bundle type '+$bundle['type'];
				return;
			}
			if ($result === FALSE) {
				echo "Error building ".$bundle['output']."<br/>";
				return;
			}
			echo $bundle['output']." ".$result." bytes<br/>";
		}
	}

	private function buildJS($output_file, $files, $comment=NULL) {
		$this->load->library('jsmin');

		$fid = fopen(FCPATH.$output_file, 'w');

		if ($comment) fwrite($fid, "/* $comment */\n");

		foreach ($files as $file) {
			$contents = file_get_contents(FCPATH.$file);
			if ($contents === FALSE) {
				echo "Crap - couldn't load file: ".$file;
				fclose($fid);
				return FALSE;
			}
			fwrite($fid, "// $file\n");
			fwrite($fid, $this->jsmin->minify($contents)."\n");
		}

		fclose($fid);

		return filesize(FCPATH.$output_file);
	}

	private function buildCSS($output_file, $files, $comment=NULL) {
		$this->load->library('cssmin');

		$fid = fopen(FCPATH.$output_file, 'w');

		if ($comment) fwrite($fid, "/* $comment */\n");

		foreach ($files as $file) {
			$contents = file_get_contents(FCPATH.$file);
			if ($contents === FALSE) {
				echo "Crap - couldn't load file: ".$file;
				fclose($fid);
				return FALSE;
			}
			fwrite($fid, "/* $file */\n");
			fwrite($fid, $this->cssmin->minify($contents)."\n");
		}

		fclose($fid);

		return filesize(FCPATH.$output_file);
	}
}
