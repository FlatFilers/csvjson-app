/*
 * CSVJSON Data Clean - Backbone.DataStore
 * 
 * Copyright (c) 2018 Martin Drapeau
 *
 * Persists to local storage:
 * - localStorage.DataCleanInputOptions
 * - localStorage.DataCleanInputText
 * - localStorage.DataCleanCode
 *
 */
(function() {

  var bareText, bareCode, exampleText, exampleCode;

  Backbone.DataStore = Backbone.Model.extend({
    defaults: {
      id: null,
      date: null,
      options: {
        autoDetectHeader: true
      },
      text: exampleText,
      code: exampleCode
    },
    urlRoot: function() {
      return APP.baseUrl() + '/save';
    },
    initialize: function(attrs, options) {
      var postfix = attrs && attrs.id ? ('_' + attrs.id) : '';
      var data = {};

      if (localStorage['DataCleanInputOptions'+postfix] !== undefined)
        try {
          data.options = JSON.parse(localStorage['DataCleanInputOptions'+postfix]);
        } catch (err) {}

      if (localStorage['DataCleanInputText'+postfix] !== undefined)
        data.text = localStorage['DataCleanInputText'+postfix];

      if (localStorage['DataCleanCode'+postfix] !== undefined)
        data.code = localStorage['DataCleanCode'+postfix];

      this.set(data);
      this.on('change', this.saveToLocalStorage);
    },
    saveToLocalStorage: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      if (this.hasChanged('options'))
        localStorage['DataCleanInputOptions'+postfix] = JSON.stringify(this.get('options'));
      if (this.hasChanged('text'))
      localStorage['DataCleanInputText'+postfix] = this.get('text');
      if (this.hasChanged('code'))
      localStorage['DataCleanCode'+postfix] = this.get('code');
    },
    clearLocalStorage: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      delete localStorage['DataCleanInputOptions'+postfix];
      delete localStorage['DataCleanInputText'+postfix];
      delete localStorage['DataCleanCode'+postfix];
    },
    clearDataOptionsCode: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      delete localStorage['DataCleanInputOptions'+postfix];
      localStorage['DataCleanInputText'+postfix] = bareText;
      localStorage['DataCleanCode'+postfix] = bareCode;
    },
    clearData: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      localStorage['DataCleanInputText'+postfix] = bareText;
    },
    clearCode: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      localStorage['DataCleanCode'+postfix] = bareCode;
    }
  }, {
    hydrateDefaults: function() {
      bareText = $('pre#bare-data').text();
      bareCode = $('pre#bare-code').text();
      exampleText = $('pre#example-data').text();
      exampleCode = $('pre#example-code').text();
      Backbone.DataStore.prototype.defaults.text = exampleText;
      Backbone.DataStore.prototype.defaults.code = exampleCode;
    }
  });

}.call(this));