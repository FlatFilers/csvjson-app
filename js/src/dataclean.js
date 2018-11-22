/*
 * CSVJSON Application - Data Clean
 *
 * Copyright (c) 2018 Martin Drapeau
 */
APP.dataclean = function() {

  var inputCollection = window.inputCollection = new Backbone.InputCollection();
  var outputCollection = window.outputCollection = new Backbone.OutputCollection();

  new Backbone.InputView({
    el: $('#tab-input'),
    collection: inputCollection
  }).render();

  new Backbone.CodeView({
    el: $('#tab-code'),
    inputCollection: inputCollection,
    outputCollection: outputCollection
  }).render();

  new Backbone.OutputView({
    el: $('#tab-output'),
    collection: outputCollection
  }).render();

};