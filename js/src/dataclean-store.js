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

  var defaultCode = `
function process(input, columns) {
  var output = [];
  input.forEach(function(inRow, r) {
    var outRow = {};
    columns.forEach(function(col) {
      var value = inRow[col];
      // Processing here
      outRow[col] = value;
    });
    output.push(outRow);
  });
  return output;
}
`;

  Backbone.DataStore = Backbone.Model.extend({
    defaults: {
      id: null,
      date: null,
      options: {
        autoDetectHeader: true
      },
      text: null,
      code: defaultCode
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
      //console.log('saveToLocalStorage', {postfix: postfix}, this.changedAttributes());
      if (this.hasChanged('options'))
        localStorage['DataCleanInputOptions'+postfix] = JSON.stringify(this.get('options'));
      if (this.hasChanged('text'))
      localStorage['DataCleanInputText'+postfix] = this.get('text');
      if (this.hasChanged('code'))
      localStorage['DataCleanCode'+postfix] = this.get('code');
    }
  });

}.call(this));