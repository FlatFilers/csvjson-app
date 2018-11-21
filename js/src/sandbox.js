self.addEventListener('message', function(e) {
  var result = eval(e.data);
  self.postMessage(result);
});