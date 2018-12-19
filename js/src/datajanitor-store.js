/*
 * CSVJSON Data Janitor - Backbone.DataStore
 * 
 * Copyright (c) 2018 Martin Drapeau
 *
 * Persists to local storage:
 * - localStorage.DataJanitorInputOptions
 * - localStorage.DataJanitorInputText
 * - localStorage.DataJanitorCode
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
      code: exampleCode,
      // Service requests
      request: {
        status: undefined,
        email: undefined,
        message: undefined,
        outputSampleText: undefined,
      }
    },
    urlRoot: function() {
      return APP.baseUrl() + '/save';
    },
    initialize: function(attrs, options) {
      var postfix = attrs && attrs.id ? ('_' + attrs.id) : '';
      var data = {};

      // TODO: remove after a while
      function migrateKey(from, to) {
        if (localStorage[from] === undefined) return;
        localStorage[to] = localStorage[from];
        delete localStorage[from];
      }
      migrateKey('DataCleanInputOptions'+postfix, 'DataJanitorInputOptions'+postfix);
      migrateKey('DataCleanInputText'+postfix, 'DataJanitorInputText'+postfix);
      migrateKey('DataCleanCode'+postfix, 'DataJanitorCode'+postfix);

      if (localStorage['DataJanitorInputOptions'+postfix] !== undefined)
        try {
          data.options = JSON.parse(localStorage['DataJanitorInputOptions'+postfix]);
        } catch (err) {}

      if (localStorage['DataJanitorInputText'+postfix] !== undefined)
        data.text = localStorage['DataJanitorInputText'+postfix];

      if (localStorage['DataJanitorCode'+postfix] !== undefined)
        data.code = localStorage['DataJanitorCode'+postfix];

      if (localStorage['DataJanitorRequest'+postfix] !== undefined)
        try {
          data.request = JSON.parse(localStorage['DataJanitorRequest'+postfix]);
        } catch (err) {}

      this.set(data);
      this.on('change', this.saveToLocalStorage);
    },
    saveToLocalStorage: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      if (this.hasChanged('options'))
        localStorage['DataJanitorInputOptions'+postfix] = JSON.stringify(this.get('options'));
      if (this.hasChanged('text'))
        localStorage['DataJanitorInputText'+postfix] = this.get('text');
      if (this.hasChanged('code'))
        localStorage['DataJanitorCode'+postfix] = this.get('code');
      if (this.hasChanged('request'))
        localStorage['DataJanitorRequest'+postfix] = JSON.stringify(this.get('request'));
    },
    clearLocalStorage: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      delete localStorage['DataJanitorInputOptions'+postfix];
      delete localStorage['DataJanitorInputText'+postfix];
      delete localStorage['DataJanitorCode'+postfix];
      delete localStorage['DataJanitorRequest'+postfix];
    },
    clearDataOptionsCode: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      delete localStorage['DataJanitorInputOptions'+postfix];
      localStorage['DataJanitorInputText'+postfix] = bareText;
      localStorage['DataJanitorCode'+postfix] = bareCode;
    },
    clearData: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      localStorage['DataJanitorInputText'+postfix] = bareText;
    },
    clearCode: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      localStorage['DataJanitorCode'+postfix] = bareCode;
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