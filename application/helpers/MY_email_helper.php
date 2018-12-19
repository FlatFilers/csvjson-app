<?php
defined('BASEPATH') OR exit('No direct script access allowed');

if (!function_exists('buildEmailBody')) {

  /*
    Prepares a responsive email body composing it with parts.
    parts is an array with:
    - type: text, button or link
    - text: text value
    - url: provide if button or link
  */
  function buildEmailBody($parts, $preview=NULL, $unsubscribe=FALSE) {
    $ci = &get_instance();
    return $ci->load->view('email_view', array(
      'parts' => $parts,
      'preview' => $preview,
      'unsubscribe' => $unsubscribe
    ), TRUE);
  }
}

if (!function_exists('buildEmailBodyWithSignature')) {
  function buildEmailBodyWithSignature($parts, $preview=NULL, $unsubscribe=FALSE) {
    $parts[] = array('type' => 'text', 'text' => 'Martin Drapeau<br/><a href="mailto:martindrapeau@gmail.com">martindrapeau@gmail.com</a>');
    return buildEmailBody($parts, $preview, $unsubscribe);
  }
}