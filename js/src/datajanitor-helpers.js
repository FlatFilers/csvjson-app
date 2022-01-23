/*
 * CSVJSON Data Janitor - Helpers
 * 
 * Copyright (c) 2022 Flatfile
 *
 */
(function() {

  _.isEmail = function(email) {
    if (!email || !_.isString(email)) return false;
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  _.notify = function(message, type) {
    var $notify = $('<div class="notify show alert alert-' + (type || 'default') + '">' + message + '</div>');
    $notify.appendTo('body');
    setTimeout(function() {
      $notify.remove();
    }, 4000);
  }
  
}.call(this));