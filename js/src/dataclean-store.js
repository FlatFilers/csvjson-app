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

  var bareCode = `function process(input, columns) {\r\n\tvar output = [];\r\n\tinput.forEach(function(inRow, r) {\r\n\t\t\/\/ Change this code\r\n\t\tvar outRow = inRow;\r\n\t\toutput.push(outRow);\r\n\t});\r\n\treturn output;\r\n}`;
  var exampleText = `Match\tDate\tResult\r\nTwins vs Yankees\t17-10-03\t4 - 8\r\nRockies vs Diamondbacks\t17-10-04\t8 - 11\r\nRed Sox vs Astros\t17-10-05\t2 - 8`;
  var exampleCode = `function process(input, columns) {\r\n\tvar output = [];\r\n\tinput.forEach(function(inRow, r) {\r\n\t\tvar outRow = {};\r\n\t\t\r\n\t\tvar teams = inRow.Match.split('vs');\r\n\t\toutRow.Home = teams[0].trim();\r\n\t\toutRow.Away = teams[1].trim();\r\n\t\t\r\n\t\tvar date = moment(inRow.Date, 'YY-MM-DD');\r\n\t\toutRow.Date = date.format('MMM Do YYYY');\r\n\t\t\r\n\t\tvar scores = inRow.Result.split('-');\r\n\t\toutRow['Home Score'] = parseInt(scores[0].trim(), 10);\r\n\t\toutRow['Away Score'] = parseInt(scores[1].trim(), 10);\r\n\t\t\r\n\t\toutRow.Winner = outRow['Home Score'] > outRow['Away Score'] ? outRow.Home : outRow.Away;\r\n\t\tif (outRow['Home Score'] == outRow['Away Score']) outRow.Winner = 'Tie';\r\n\r\n\t\toutput.push(outRow);\r\n\t});\r\n\treturn output;\r\n}`;

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
      localStorage['DataCleanInputText'+postfix] = 'Column\r\nCopy and paste data here';
      localStorage['DataCleanCode'+postfix] = bareCode;
    },
    clearData: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      localStorage['DataCleanInputText'+postfix] = 'Column\r\nCopy and paste data here';
    },
    clearCode: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      localStorage['DataCleanCode'+postfix] = bareCode;
    }
  });

}.call(this));