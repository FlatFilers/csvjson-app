/*
 * CSVJSON Data Clean - Web Worker for Safe Eval
 * 
 * Copyright (c) 2018 Martin Drapeau
 *
 */
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.9.1/underscore-min.js');
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/underscore.string/3.3.5/underscore.string.min.js');
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.22.2/moment-with-locales.min.js');
self.addEventListener('message', function(e) {
	_.isEmail = function(email) {
		if (!email || !_.isString(email)) return false;
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
	}
  var result = eval(e.data);
  self.postMessage(result);
});