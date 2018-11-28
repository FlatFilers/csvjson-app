/*
 * CSVJSON Data Clean
 *
 * Copyright (c) 2018 Martin Drapeau
 */
APP.dataclean = function() {

  function go() {
    var inputCollection = window.inputCollection = new Backbone.InputCollection();
    var outputCollection = window.outputCollection = new Backbone.OutputCollection();
    var store = window.store = new Backbone.DataStore(_.extend({}, APP.data, {id: APP.id || null}));

    var codeView = new Backbone.CodeView({
      el: $('#tab-code'),
      inputCollection: inputCollection,
      outputCollection: outputCollection,
      store: store
    }).render();

    var dataView = new Backbone.DataView({
      el: $('#tab-data'),
      inputCollection: inputCollection,
      outputCollection: outputCollection,
      store: store,
      codeView: codeView
    }).render();
  }

  if (APP.id && APP.data_url) {
    // Load from CDN
    $.getJSON(APP.data_url).done(function(data) {
      APP.data = data;
      go();
    });
  } else {
    // No data or bootstrapped in
    go();
  }

};