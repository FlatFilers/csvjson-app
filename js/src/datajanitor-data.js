/*
 * CSVJSON Data Janitor - Backbone.DataView
 * 
 * Copyright (c) 2022 Flatfile
 *
 */
(function() {

  Backbone.DataView = Backbone.View.extend({
    template: _.template(`
      <div class="row">
        <div class="col-md-12">
          <h4>
            <span>Input</span>
            &nbsp;&nbsp;
            <small><%=inputRowCount%>&nbsp;rows</small>
            <small class="pull-right">
              <div class="form-inline">
                <div class="form-group">
                  <div class="checkbox" data-toggle="tooltip" data-placement="top" title="Auto-detect column header as the first row with non-empty cells. Ignore previous rows.">
                    <label class=""><input type="checkbox" name="autoDetectHeader" <%=autoDetectHeader ? 'checked' : ''%> /> Auto-detect header</label>
                  </div>
                </div>
                &nbsp;&nbsp;
                <div class="form-group">
                  <button class="btn btn-default btn-xs text-danger clear-input" data-toggle="tooltip" data-placement="top" title="Clear input data to start from scratch.">Clear</button>
                </div>
                &nbsp;&nbsp;
                <div class="form-group">
                  <button class="btn btn-default btn-xs copy-input" data-toggle="tooltip" data-placement="top" title="Copy table data so you can pasted in Excel or Google Sheets."><i class="glyphicon glyphicon-share"></i>&nbsp;Copy to clipboard</button>
                </div>
                &nbsp;&nbsp;
                <div class="dropdown pull-right">
                  <button class="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown" role="button">
                    <span class="size"><%=inputPageSize%></span>
                    &nbsp;
                    <span class="caret"></span>
                  </button>
                  <ul class="dropdown-menu">
                    <li class="dropdown-header">Page size</li>
                    <li><a href="#" class="input table-page-size" data-value="5">5 rows</a></li>
                    <li><a href="#" class="input table-page-size" data-value="10">10 rows</a></li>
                    <li><a href="#" class="input table-page-size" data-value="25">25 rows</a></li>
                    <li><a href="#" class="input table-page-size" data-value="50">50 rows</a></li>
                    <li><a href="#" class="input table-page-size" data-value="100">100 rows</a></li>
                  </ul>
                </div>
              </div>
            </small>
          </h4>
          <table class="table table-bordered backgrid input"></table>
          <h4>
            <span>Output</span>
            &nbsp;&nbsp;
            <small><%=outputRowCount%>&nbsp;rows</small>
            <small class="pull-right">
              <a class="btn btn-primary btn-xs download" download="datajanitor.csv" target="_self" data-toggle="tooltip" data-placement="top" title="Save as datajanitor.csv"><i class="glyphicon glyphicon-download"></i>&nbsp;Download CSV</a>
              &nbsp;&nbsp;
              <button class="btn btn-primary btn-xs copy-output" data-toggle="tooltip" data-placement="top" title="Copy table data so you can pasted in Excel or Google Sheets."><i class="glyphicon glyphicon-share"></i>&nbsp;Copy to clipboard</button>
              &nbsp;&nbsp;
              <div class="dropdown pull-right">
                <button class="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown" role="button">
                  <span class="size"><%=outputPageSize%></span>
                  &nbsp;
                  <span class="caret"></span>
                </button>
                <ul class="dropdown-menu">
                  <li class="dropdown-header">Page size</li>
                  <li><a href="#" class="output table-page-size" data-value="5">5 rows</a></li>
                  <li><a href="#" class="output table-page-size" data-value="10">10 rows</a></li>
                  <li><a href="#" class="output table-page-size" data-value="25">25 rows</a></li>
                  <li><a href="#" class="output table-page-size" data-value="50">50 rows</a></li>
                  <li><a href="#" class="output table-page-size" data-value="100">100 rows</a></li>
                </ul>
              </div>
            </small>
          </h4>
          <table class="table table-bordered backgrid output"></table>
        </div>
      </div>
    `),
    events: {
      'change input[name=autoDetectHeader]': 'onChangeAutoDetectOption',
      'click button.clear-input': 'clearInput',
      'click button.copy-input': 'copyInput',
      'click button.copy-output': 'copyOutput',
      'click a.download': 'onClickDownload',
      'click .table-page-size': 'onClickTablePageSize'
    },
    initialize: function(options) {
      this.store = options.store;
      this.inputCollection = options.inputCollection;
      this.outputCollection = options.outputCollection;
      this.codeView = options.codeView;

      var storeOptions = this.store.get('options');
      this.inputCollection.setPageSize(storeOptions.inputPageSize);
      this.outputCollection.setPageSize(storeOptions.outputPageSize);

      this.listenTo(this.store, 'change:id', this.render);
      this.listenTo(this.outputCollection, 'reset', this.render);
      $(document).on('paste', this.onPaste.bind(this));

      _.defer(function() {
        this.parsePastedText();
      }.bind(this));
    },
    // TODO: This method should trigger a render. Currently it doesn't
    // and the update is done manually. Change that.
    onClickTablePageSize: function(e) {
      e.preventDefault();
      var $a = $(e.currentTarget);
      var size = parseInt($a.data('value'), 10);

      var option = 'inputPageSize';
      var collection = this.inputCollection;
      if ($a.hasClass('output')) {
        option = 'outputPageSize';
        collection = this.outputCollection;
      }

      $a.closest('ul.dropdown-menu').siblings('button.dropdown-toggle').find('.size').text(size);

      var options = _.extend({}, this.store.get('options'));
      options[option] = size;
      this.store.set({options: options});

      collection.setPageSize(size);
    },
    onChangeAutoDetectOption: function(e) {
      var options = _.extend({}, this.store.get('options'), {
        autoDetectHeader: this.$('input[name=autoDetectHeader]').is(':checked')
      });
      this.store.set({options: options});
      this.parsePastedText();
    },
    clearInput: function() {
      this.store.clearData();
      window.location.reload();
    },
    copyInput: function() {
      _.copyToClipboard(this.inputCollection.toCSV('\t'));
      this.$('button.copy-input').yes();
    },
    copyOutput: function() {
      _.copyToClipboard(this.outputCollection.toCSV('\t'));
      this.$('button.copy-output').yes();
    },
    onClickDownload: function(e) {
      var $download = this.$('a.download');
      if ($download.attr('disabled')) return;
      var data = 'data:application/json;charset=utf-8,' + this.outputCollection.toCSV(',');
      $download.yes();
      download(data, $download.attr('download'), 'application/json');
    },

    // Paste and parse
    parsePastedText: function() {
      this.inputCollection.fullCollection.reset();
      var options = this.store.get('options');
      var text = (this.store.get('text') || '').trim();
      var lines = text ? text.split('\n') : [];

      // Determine the number of columns.
      // Optionally detect the column header: the first row with values in each column.
      // Otherwise, use column positions.
      var columns = [];
      var rows = [];
      var maxCols = 0;
      var rowWithColumnHeaders;
      lines.forEach(function(rowAsText, r) {
        // Remove wrapping double quotes
        var row = rowAsText.split('\t').map(function(colAsText) {
          return colAsText.trim().replace(/^"(.*)"$/, '$1');
        });
        // Remove trailing empty cells
        while (row.length && !row[row.length-1]) row.pop();
        // First row with values throughout is the column header
        if (options.autoDetectHeader && rowWithColumnHeaders === undefined && row.length == _.compact(row).length) {
          rowWithColumnHeaders = r;
        }
        if (row.length > maxCols) maxCols = row.length;
        rows.push(row);
      });
      if (!options.autoDetectHeader || rowWithColumnHeaders === undefined) {
        for (var i = 0; i < maxCols; i++) columns.push(i+'');
      } else {
        var columns = rows[rowWithColumnHeaders].map(function(s) {
          return s.trim();
        });
      }
      Backbone.InputModel.setColumns(columns);

      rows.forEach(function(row, r) {
        var error;
        if (options.autoDetectHeader && rowWithColumnHeaders !== undefined && rowWithColumnHeaders >= r) {
          error = 'Header row and previous rows will not be processed. To use index-based column headers instead, un-toggle the auto-detect header option.';
          return true;
        }

        var model = new Backbone.InputModel({__Row: this.inputCollection.fullCollection.size(), __Error: error});
        row.forEach(function(value, c) {
          var name = columns[c];
          model.set(name, value);
        }.bind(this));
        this.inputCollection.fullCollection.add(model);
      }.bind(this));

      this.inputCollection.trigger('ready');

      this.render();
    },
    onPaste: function(e) {
      if (!this.$el.hasClass('active')) return;
      if (!e.originalEvent || !e.originalEvent.clipboardData || !e.originalEvent.clipboardData.items) return;
      var data = _.findWhere(e.originalEvent.clipboardData.items, {type: 'text/plain'});
      if (!data) return;

      data.getAsString(function(text) {
        this.store.set({text: text.replace(/\r/g, '').trim('\n')});
        this.parsePastedText();
        _.notify(this.inputCollection.fullCollection.size() + ' rows of data pasted into Input table.', 'success');
      }.bind(this));

    },

    toRender: function() {
      return _.extend({
        id: this.store.id,
        inputRowCount: this.inputCollection.fullCollection.size(),
        outputRowCount: this.outputCollection.fullCollection.size()
      }, this.store.get('options'));
    },
    render: function() {
      var data = this.toRender();
      this.$el.html(this.template(data));

      this.$('[data-toggle="tooltip"]').tooltip();

      var inputColumns = [{
        name: '__Row',
        label: '',
        cell: Backgrid.RowCountCell,
        editable: false
      }];
      _.each(Backbone.InputModel.getColumns(), function(col) {
        inputColumns.push({
          name: col,
          label: col,
          cell: Backgrid.ReportingCell,
          editable: false
        });
      });

      new Backgrid.Grid({
        el: this.$('table.input'),
        collection: this.inputCollection,
        columns: inputColumns,
        emptyText: 'Copy data from Excel or Google Sheets (Ctrl+c). Then paste it on this page to fill this table (Ctrl+v).'
      }).render();

      new Backgrid.Extension.Paginator({
        collection: this.inputCollection
      }).render().$el.insertAfter(this.$('table.input'));


      var outputColumns = [{
        name: '__Row',
        label: '',
        cell: Backgrid.RowCountCell,
        editable: false
      }];
      if (this.outputCollection.fullCollection.size()) {
        var keys = _.without(this.outputCollection.fullCollection.first().keys(), '__Row');
        _.each(keys, function(col) {
          outputColumns.push({
            name: col,
            label: col,
            cell: Backgrid.ReportingCell,
            editable: false
          });
        });
      }
      new Backgrid.Grid({
        el: this.$('table.output'),
        collection: this.outputCollection,
        columns: outputColumns,
        emptyText: this.codeView.error ? 'Error in process function. Please click on the Clean & Transform tab to correct it.' : 'No data'
      }).render();

      if (this.outputCollection.fullCollection.size()) {
        new Backgrid.Extension.Paginator({
          collection: this.outputCollection
        }).render().$el.insertAfter(this.$('table.output'));
      }

      var $download = this.$('a.download');
      if (this.outputCollection.size() == 0) {
        $download.attr('disabled', true);
        $download.attr('title', 'No data to download. Convert first.');
      }

      return this;
    }
  });


  Backbone.InputModel = Backbone.Model.extend({
    defaults: {
      __Row: null,
      __Error: null
    },
  }, {
    setColumns: function(columns) {
      var defaults = {
        __Row: null,
        __Error: null
      };
      _.each(columns, function(col) {
        defaults[col] = null;
      });
      Backbone.InputModel.prototype.defaults = defaults;
    },
    getColumns: function() {
      return _.without(_.keys(Backbone.InputModel.prototype.defaults), '__Row', '__Error');
    }
  });
  Backbone.InputCollection = Backbone.PageableCollection.extend({
    model: Backbone.InputModel,
    mode: 'client',
    state: {
      pageSize: 5
    },
    toCSV: function(separator) {
      if (this.fullCollection.size() == 0) return '';
      var keys = _.without(this.fullCollection.first().keys(), '__Row', '__Error');
      var data = this.fullCollection.map(function(model) {
        return model.pick(keys);
      });
      return _.convert(data, separator);
    }
  });

  Backbone.OutputModel = Backbone.Model.extend({
    defaults: {
      __Row: null
    }
  });
  Backbone.OutputCollection = Backbone.PageableCollection.extend({
    model: Backbone.OutputModel,
    mode: 'client',
    state: {
      pageSize: 5
    },
    toCSV: function(separator) {
      if (this.fullCollection.size() == 0) return '';
      var keys = _.without(this.fullCollection.first().keys(), '__Row');
      var data = this.fullCollection.map(function(model) {
        return model.pick(keys);
      });
      return _.convert(data, separator);
    }
  });

  Backgrid.RowCountCell = Backgrid.Cell.extend({
    className: 'reporting-cell',
    render: function () {
      this.$el.empty();
      var columnName = this.column.get('name');
      var value = this.model.get(columnName) + 1;
      this.$el.html(value);
      var error = this.model.get('__Error');
      if (error) {
        this.$el.append('&nbsp;<i class="glyphicon glyphicon-warning-sign text-danger" data-toggle="tooltip" data-placement="right" title="' + (error+'').replace(/"/g, "'") + '"></i>');
        this.$('[data-toggle="tooltip"]').tooltip();
      }
      this.delegateEvents();
      return this;
    }
  });

  Backgrid.ReportingCell = Backgrid.Cell.extend({
    className: 'reporting-cell',
    render: function () {
      this.$el.empty();
      var columnName = this.column.get('name');
      var rawValue = this.model.get(columnName);
      var formattedValue = this.formatter.fromRaw(rawValue, this.model);
      this.$el.html(formattedValue);
      if (formattedValue && formattedValue.length && formattedValue.length > 20)
        this.$el.attr('title', formattedValue);
      if (this.model.errorModel) {
        var error = this.model.errorModel.get(columnName);
        if (error) this.$el.prepend('<i class="fa fa-fw fa-warning text-danger" title="' + (error+'').replace(/"/g, "'") + '"></i>&nbsp;');
      }
      this.delegateEvents();
      return this;
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