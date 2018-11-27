/*
 * CSVJSON Data Clean
 *
 * Copyright (c) 2018 Martin Drapeau
 */
APP.dataclean = function() {

  function go() {
    var inputCollection = new Backbone.InputCollection();
    var outputCollection = new Backbone.OutputCollection();
    var store = new Backbone.DataStore(_.extend({}, APP.data, {id: APP.id || null}));

    new Backbone.InputView({
      el: $('#tab-input'),
      collection: inputCollection,
      store: store
    }).render();

    new Backbone.CodeView({
      el: $('#tab-code'),
      inputCollection: inputCollection,
      outputCollection: outputCollection,
      store: store
    }).render();

    new Backbone.OutputView({
      el: $('#tab-output'),
      collection: outputCollection,
      store: store
    }).render();

    new Backbone.ShareView({
      el: $('a.save-permalink'),
      store: store
    }).render();
  }

  if (APP.id && APP.data_url) {
    // Load from CDN
    $.getJSON(APP.data_url).done(function(data) {
      APP.data = data;
      go();
    });
  } else {
    // No data or bootstrapped in already
    go();
  }

};