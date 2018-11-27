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

  var defaultText = `Match\tDate\tResult\r\nTwins vs Yankees\t17-10-03\t4 - 8\r\nRockies vs Diamondbacks\t17-10-04\t8 - 11\r\nRed Sox vs Astros\t17-10-05\t2 - 8`;

  var defaultCode = `
function process(input, columns) {
  var output = [];
  input.forEach(function(inRow, r) {
    var outRow = {};
    
    var teams = inRow.Match.split('vs');
    outRow.Home = teams[0].trim();
    outRow.Away = teams[1].trim();
    
    var date = moment(inRow.Date, 'YY-MM-DD');
    outRow.Date = date.format('MMM Do YYYY');
    
    var scores = inRow.Result.split('-');
    outRow['Home Score'] = parseInt(scores[0].trim(), 10);
    outRow['Away Score'] = parseInt(scores[1].trim(), 10);
    
    outRow.Winner = outRow['Home Score'] > outRow['Away Score'] ? outRow.Home : outRow.Away;
    if (outRow['Home Score'] == outRow['Away Score']) outRow.Winner = 'Tie';

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
      text: defaultText,
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
    },
    clearLocalStorage: function() {
      var postfix = this.id ? ('_' + this.id) : '';
      delete localStorage['DataCleanInputOptions'+postfix];
      delete localStorage['DataCleanInputText'+postfix];
      delete localStorage['DataCleanCode'+postfix];
    }
  });

}.call(this));