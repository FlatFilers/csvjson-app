/*
 * Backbone.OutputView
 * 
 * Copyright (c) 2018 Martin Drapeau
 *
 */
(function() {

  Backbone.OutputView = Backbone.View.extend({
    template: _.template(`
      <div class="row">
        <div class="col-md-9">
          <table class="table table-bordered backgrid"></table>
        </div>
        <div class="col-md-3">
          <p>Download as CSV or copy data and paste back in Excel or Google Sheets.</p>
          <br/>
          <div class="row">
            <div class="col-xs-9">
              <a class="btn btn-primary btn-block download" download="dataclean.csv" target="_self" title="Save as dataclean.csv"><i class="glyphicon glyphicon-download"></i> Download CSV</a>
              <br/>
              <button class="btn btn-primary btn-block copy"><i class="glyphicon glyphicon-share"></i> Copy to clipboard</button>
            </div>
          </div>
          <br/>
        </div>
      </div>
    `),
    events: {
      'click button.copy': 'copy',
      'click a.download': 'onClickDownload'
    },
    initialize: function(options) {
      $(document).find('a[role=tab][href=#tab-output]').on('shown.bs.tab', this.render.bind(this));
    },
    copy: function() {
      _.copyToClipboard(this.collection.toCSV('\t'));
      this.$('button.copy').yes();
    },
    onClickDownload: function() {
      this.$('a.download').yes();
    },
    toRender: function() {
      return {};
    },
    render: function() {
      var data = this.toRender();
      this.$el.html(this.template(data));

      var columns = [{
        name: '__Row',
        label: '',
        cell: Backgrid.RowCountCell,
        editable: false
      }];
      if (this.collection.size()) {
        var keys = _.without(this.collection.first().keys(), '__Row');
        _.each(keys, function(col) {
          columns.push({
            name: col,
            label: col,
            cell: Backgrid.ReportingCell,
            editable: false
          });
        });
      }
      new Backgrid.Grid({
        el: this.$('table'),
        collection: this.collection,
        columns: columns
      }).render();

      var $download = this.$('a.download');
      var csv = escape(this.collection.toCSV(','));
      $download.attr('href', 'data:application/json;charset=utf-8,' + csv);
      if (csv && csv.length > 65400) {
        $download
          .attr('disabled', true)
          .attr('title', 'Too large to download. Copy to clipboard instead.');
      } else if (csv.length == 0) {
        $download.attr('disabled', true);
        $download.attr('title', 'No data to download. Convert first.');
      }

      return this;
    }
  });
 
  Backbone.OutputModel = Backbone.Model.extend({
    defaults: {
      __Row: null
    }
  });
  Backbone.OutputCollection = Backbone.Collection.extend({
    model: Backbone.OutputModel,
    toCSV: function(separator) {
      if (this.size() == 0) return '';
      var keys = _.without(this.first().keys(), '__Row');
      var data = this.map(function(model) {
        return model.pick(keys);
      });
      return _.convert(data, separator);
    }
  });

  $.fn.yes = function() {
    this.each(function() {
      var $el = $(this);
      var classNames = $el.find('.glyphicon').attr('class');
      $el.find('.glyphicon').removeClass().addClass('glyphicon glyphicon-refresh glyphicon-spin');
      $el.attr('disabled', true);
      setTimeout(function() {
        $el.removeAttr('disabled');
        $el.find('.glyphicon').removeClass().addClass('glyphicon glyphicon-ok');
        setTimeout(function() {
          $el.find('.glyphicon').removeClass().addClass(classNames);
        }, 2000);
      }, 500);
    });
  };

  _.copyToClipboard = function(str) {
    var $textarea = $('<textarea style="position:absolute;left:-9999px;" readonly></textarea>');
    $('body').append($textarea);
    $textarea.val(str);
    $textarea[0].select();
    document.execCommand('copy');
    $textarea.remove();
  };

  _.convert = function(data, separator) {
    separator || (separator = ',');
    if (!_.isObject(data)) throw 'Your JSON must be an array or an object.';
    if (!_.isArray(data)) data = [data];

    var allKeys = [],
        allRows = [];
    for (var i = 0; i < data.length; i++) {
      var o = data[i],
          row = {};
      if (o !== undefined && o !== null && (!_.isObject(o) || _.isArray(o)))
        throw 'Item in array is not an object: ' + JSON.stringify(o);
      var keys = _.keys(o);
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        if (allKeys.indexOf(key) === -1) allKeys.push(key);
        var value = o[key];
        if (value === undefined && value === null) continue;
        if (_.isString(value)) {
          row[key] = '"' + value.replace(/"/g, '""') + '"';
        } else {
          row[key] = JSON.stringify(value);
          if (_.isObject(value) || _.isArray(value))
            row[key] = '"' + row[key].replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
        }
      }
      allRows.push(row);
    }

    keyValues = [];
    for (var i = 0; i < allKeys.length; i++) {
      keyValues.push('"' + allKeys[i].replace(/"/g, '""') + '"');
    }

    var csv = keyValues.join(separator)+'\n';
    for (var r = 0; r < allRows.length; r++) {
      var row = allRows[r],
          rowArray = [];
      for (var k = 0; k < allKeys.length; k++) {
        var key = allKeys[k];
        rowArray.push(row[key] || '');
      }
      csv += rowArray.join(separator) + '\n';
    }
    
    return csv;
  };

}.call(this));