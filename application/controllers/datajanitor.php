<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
 * CSV to JSON Controller
 *
 * Copyright (c) 2018 Martin Drapeau
 *
 */

class Datajanitor extends MY_Controller {
	
	public function __construct() {
		parent::__construct();
		
		$this->page = 'datajanitor';
		$this->title = 'Data Janitor';
		$this->beta = true;
		$this->description = 'Online tool to clean and transform Excel and Google Sheets data.';
		$this->view = 'datajanitor_view';
	}

	public function hire($id) {
    if ($_SERVER['REQUEST_METHOD'] != 'PUT') {
      httpResponseCode(405);
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
    $this->email->reply_to('martindrapeau@gmail.com', 'Martin Drapeau');
    $this->email->to(array($arguments['email'], 'martindrapeau@gmail.com'));
    $this->email->subject($subject);
    $this->email->message($body);
    $result = $this->email->send();
    if ($result !== TRUE) throw new Exception("Unexpected error trying to send email.");


    ajaxJsonReply(array('id' => $id));
	}

}