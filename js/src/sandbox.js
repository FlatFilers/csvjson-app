self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.9.1/underscore-min.js');
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.22.2/moment-with-locales.min.js');
self.addEventListener('message', function(e) {
  var result = eval(e.data);
  self.postMessage(result);
});