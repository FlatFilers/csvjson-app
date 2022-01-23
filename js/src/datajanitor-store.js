/*
 * CSVJSON Data Janitor - Backbone.DataStore
 * 
 * Copyright (c) 2022 Flatfile
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
        name: null,
        autoDetectHeader: true,
        inputPageSize: 5,
        outputPageSize: 5,
        codeInputRowStart: 0,
        codeOutputRowStart: 0
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
      return APP.baseUrl() + '/session';
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

      // TODO: remove after a while
      function createSessions() {
        var sessions = [];
        try {
          sessions = JSON.parse(window.localStorage.DataJanitorSessions);
        } catch (err) {}

        var keys = _.keys(window.localStorage);
        _.each(keys, function(key) {
          var parts = key.split('_');
          if (parts.length == 2 && parts[0] == 'DataJanitorCode' && sessions.indexOf(parts[1]) === -1)
            sessions.push(parts[1]);
        });
        if (this.id && sessions.indexOf(this.id) === -1) sessions.push(this.id);

        window.localStorage.DataJanitorSessions = JSON.stringify(sessions);
      }
      createSessions();

      // TODO: remove after a while
      function createSessionNames() {
        var names = {};
        try {
          names = JSON.parse(window.localStorage.DataJanitorSessionNames);
        } catch (err) {
          window.localStorage.DataJanitorSessionNames = JSON.stringify(names);
        }
      }
      createSessionNames();

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

      // TODO: remove after a while
      function createMissingOptions() {
        this.set({options: _.extend({
          inputPageSize: Backbone.DataStore.prototype.defaults.options.inputPageSize,
          outputPageSize: Backbone.DataStore.prototype.defaults.options.outputPageSize,
          codeInputRowStart: Backbone.DataStore.prototype.defaults.options.codeInputRowStart,
          codeOutputRowStart: Backbone.DataStore.prototype.defaults.options.codeOutputRowStart
        }, this.get('options'))});
      }
      createMissingOptions.apply(this);

      this.on('change', this.saveToLocalStorage);

      this.maybeUpdateSessions();
    },
    save: function() {
      return Backbone.Model.prototype.save.apply(this, arguments).done(function() {
        this.clearLocalStorage();
        this.maybeUpdateSessions();
      }.bind(this));
    },
    destroy: function() {
      return Backbone.Model.prototype.destroy.apply(this, arguments).done(function() {
        this.clearLocalStorage();
        this.removeFromSessions();
      }.bind(this));
    },
    isLocalStorageDifferentThanServer: function() {
      if (!this.id) return true;
      var postfix = '_' + this.id;
      return (localStorage['DataJanitorInputOptions'+postfix] ||
        localStorage['DataJanitorInputText'+postfix] ||
        localStorage['DataJanitorCode'+postfix] ||
        localStorage['DataJanitorRequest'+postfix]);
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

      if (this.id) this.maybeUpdateSessions();
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
    },
    getSessions: function() {
      return JSON.parse(window.localStorage.DataJanitorSessions);
    },
    getSessionNames: function() {
      return JSON.parse(window.localStorage.DataJanitorSessionNames);
    },
    removeFromSessions: function() {
      if (!this.id) return;
      window.localStorage.DataJanitorSessions = JSON.stringify(_.without(this.getSessions(), this.id));
    },
    maybeUpdateSessions: function() {
      var sessions = this.getSessions();
      if (this.id && sessions.indexOf(this.id) === -1) {
        sessions.push(this.id);
        window.localStorage.DataJanitorSessions = JSON.stringify(sessions);
      }

      var names = this.getSessionNames();
      var name = this.get('options').name || undefined;
      if (names[this.id] != name) {
        if (!name) {
          delete names[this.id];
        } else {
          names[this.id] = name;
        }
        window.localStorage.DataJanitorSessionNames = JSON.stringify(names);
      }
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