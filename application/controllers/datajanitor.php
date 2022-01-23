<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSV to JSON Controller
 *
 * Copyright (c) 2022 Flatfile
 *
 */

class Datajanitor extends MY_Controller {

	public function __construct() {
		parent::__construct();

		$this->page = 'datajanitor';
    $this->tool = 'Data Janitor';
		$this->title = 'Data Janitor';
		$this->beta = true;
		$this->description = 'Online tool to clean and transform Excel and Google Sheets data.';
		$this->view = 'datajanitor_view';
	}

  public function docs($subView=null) {
    $subViews = array(
      'help' => 'Help',
      'tips' => 'Tips',
      'example-baseball-matches' => 'Baseball Matches',
      'example-spacex-nasa-launches-iss' => 'SpaceX NASA Launches to ISS',
      'example-players' => 'Import Contacts into a CRM',
    );
    if (!array_key_exists($subView, $subViews)) {
      set_status_header(404);
      return;
    }

    $title = $this->title . (strpos($subView, 'example') === 0 ? ' Example: ' : ' ') . $subViews[$subView];

    $descriptions = array(
      'help' => 'Instructions using and background on CSVJSON Data Janitor',
      'tips' => 'Programming tips on using CSVJSON Data Janitor',
      'example-baseball-matches' => 'Example usage of CSVJSON Data Janitor. Parsing MLB matches.',
      'example-spacex-nasa-launches-iss' => 'Example usage of CSVJSON Data Janitor. Parsing SpaceX launch manifest to extract missions to the International Space Station.',
      'example-players' => 'Example usage of CSVJSON Data Janitor. Converting a list of contacts for import into another CRM.'
    );

    $this->load->view('page', array(
      'page' => $this->page,
      'tool' => $this->tool,
      'run' => false,
      'title' => $title,
      'beta' => $this->beta,
      'description' => $descriptions[$subView],
      'id' => null,
      'data' => null,
      'data_url' => null,
      'view' => 'datajanitor/docs_view',
      'subView' => $subView,
      'subViews' => $subViews,
      'showSave' => false
    ));
  }

	public function hire($id) {
    if ($_SERVER['REQUEST_METHOD'] != 'PUT') {
      set_status_header(405);
      return;
    }

  	$attributes = array('email', 'message', 'output');
    $arguments = getJson($attributes, $attributes);

    $subject = 'CSVJSON Data Janitor Session '.substr($id, 0, 8);
    $url = base_url().'/datajanitor/'.$id;
    $body = buildEmailBodyWithSignature(array(
      array('type' => 'text', 'text' => 'Request '.substr($id, 0, 8).' received.'),
      array('type' => 'text', 'text' => 'Your email: '.$arguments['email']),
      array('type' => 'text', 'text' => 'Your message: '.$arguments['message']),
      array('type' => 'text', 'text' => 'Your request information can be viewed and modified via this URL.'),
      array('type' => 'link', 'text' => $url, 'url' => $url),
      array('type' => 'text', 'text' => 'Reply to this email thread for ongoing communication.'),
    ));

    $this->email->set_mailtype('html');
    $this->email->from(DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME);
    $this->email->reply_to('hello@flatfile.com', 'Flatfile');
    $this->email->to(array($arguments['email'], 'hello@flatfile.com'));
    $this->email->subject($subject);
    $this->email->message($body);
    $result = $this->email->send();
    if ($result !== TRUE) throw new Exception("Unexpected error trying to send email.");


    ajaxJsonReply(array('id' => $id));
	}

  public function clone_example($name) {
    $filename = FCPATH."application/views/datajanitor/example-$name.json";
    if (!file_exists($filename)) {
      show_404();
      return;
    }
    $data = file_get_contents($filename);

    $id = generateUniqueId();
    $data = str_replace('{{ID}}', $id, $data);

    if (defined('AWS_S3_URL')) {
      // Persist to AWS S3
      require_once(FCPATH.'application/libraries/s3.php');
      S3::setAuth(AWS_S3_KEY, AWS_S3_SECRET, AWS_S3_REGION);
      S3::putObject($data, AWS_S3_BUCKET, "data/$id", S3::ACL_PUBLIC_READ, array(), array('Content-Type' => 'application/json'));
    } else {
      // Persist to disk
      file_put_contents(FCPATH."data/$id", $data);
    }

    redirect("/datajanitor/$id");
  }

  public function session($id=null) {
    switch ($_SERVER['REQUEST_METHOD']) {

      case 'POST':
        if ($id !== null) {
          set_status_header(400);
          return;
        }
        return $this->save($id);

      case 'PUT':
        if ($id === null) {
          set_status_header(404);
          return;
        }
        return $this->save($id);

      case 'DELETE':
        if ($id === null) {
          set_status_header(404);
          return;
        }
        return $this->delete($id);
    }
  }

  private function delete($id) {
    if (defined('AWS_S3_URL')) {
      require_once(FCPATH.'application/libraries/s3.php');
      S3::setAuth(AWS_S3_KEY, AWS_S3_SECRET, AWS_S3_REGION);
      if (!S3::deleteObject(AWS_S3_BUCKET, "data/$id")) {
        show_404();
        return;
      }
    } else {
      $filename = FCPATH."data/$id";
      if (!file_exists($filename)) {
        show_404();
        return;
      }
      unlink($filename);
    }

    set_status_header(204);
  }

  public function published($id) {
    $data = NULL;
    $data_url = NULL;
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

    $this->load->view('datajanitor/published_page', array(
      'id' => $id,
      'data' => $data,
      'data_url' => $data_url
    ));
  }

}
