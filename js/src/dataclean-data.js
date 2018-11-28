/*
 * CSVJSON Data Clean - Backbone.DataView
 * 
 * Copyright (c) 2018 Martin Drapeau
 *
 */
(function() {

  Backbone.DataView = Backbone.View.extend({
    template: _.template(`
      <div class="row">
        <div class="col-md-9">
          <h4>
            Input
            <small class="pull-right">
              <button class="btn btn-default btn-xs text-danger clear-local-storage" title="<%= id ? 'Reverts changes to the last version saved to the server.' : 'Resets to the original example.' %>"><i class="glyphicon glyphicon-trash"></i> Clear local storage</button>
            </small>
          </h4>
          <table class="table table-bordered backgrid input"></table>
          <h4>
            Output
            <small class="pull-right">
              <div class="btn-toolbar">
                <a class="btn btn-primary btn-xs pull-right download" download="dataclean.csv" target="_self" title="Save as dataclean.csv"><i class="glyphicon glyphicon-download"></i> Download CSV</a>
                <button class="btn btn-primary btn-xs pull-right copy"><i class="glyphicon glyphicon-share"></i> Copy to clipboard</button>
              </div>
            </small>
          </h4>
          <table class="table table-bordered backgrid output"></table>
        </div>
        <div class="col-md-3">
          <h4>Instructions</h4>
          <p><strong>Paste (Ctrl+v) your Excel or Google Sheets data here.</strong></p>
          <p>Then go to Clean &amp; Transform to modify the JavaScript <code>process</code> function.</p>
          <p>Come back afterwards to copy the output.</p>
          <br/>
          <h4>Options</h4>
          <form>
            <div class="checkbox">
              <label class=""><input type="checkbox" name="autoDetectHeader" <%=autoDetectHeader ? 'checked' : ''%> /> Auto-detect column header as the first row with non-empty cells. Ignore previous rows.</label>
            </div>
          </form>
          <br/>
          <h4>Auto-save</h4>
          <p>
            Your input data and code is auto-saved to local storage.
          </p>
          <p>
            Click on the <strong><i class="glyphicon glyphicon-link"></i> Save</strong> link to persist to server in order to share with colleagues.
          </p>
        </div>
      </div>
    `),
    events: {
      'change input[type=checkbox]': 'onChangeOption',
      'click button.clear-local-storage': 'onClickClear',
      'click button.copy': 'copy',
      'click a.download': 'onClickDownload'
    },
    initialize: function(options) {
      this.store = options.store;
      this.inputCollection = options.inputCollection;
      this.outputCollection = options.outputCollection;
      this.codeView = options.codeView;

      this.listenTo(this.store, 'change:id', this.render);
      this.listenTo(this.outputCollection, 'reset', this.render);
      $(document).on('paste', this.onPaste.bind(this));

      _.defer(function() {
        this.parsePastedText();
      }.bind(this));
    },

    onChangeOption: function(e) {
      var options = {
        autoDetectHeader: false
      };
      var form = this.$('form').serializeObject();
      if (form.autoDetectHeader) options.autoDetectHeader = true;
      this.store.set({options: options});
      this.parsePastedText();
    },
    onClickClear: function(e) {
      e.preventDefault();
      this.store.clearLocalStorage();
      window.location.reload();
    },
    copy: function() {
      _.copyToClipboard(this.outputCollection.toCSV('\t'));
      this.$('button.copy').yes();
    },
    onClickDownload: function() {
      this.$('a.download').yes();
    },

    // Paste and parse
    parsePastedText: function() {
      this.inputCollection.fullCollection.reset();
      var options = this.store.get('options');
      var lines = (this.store.get('text') || '').split('\r\n');

      // Determine the number of columns.
      // Optionally detect the column header: the first row with values in each column.
      // Otherwise, use column positions.
      var columns = [];
      var maxCols = 0;
      var rowWithColumnHeaders;
      for (var r = 0; r < lines.length; r++) {
        var items = lines[r].split('\t');
        if (items.length > maxCols) maxCols = items.length;
        if (options.autoDetectHeader && items.length == _.compact(items).length) {
          rowWithColumnHeaders = r;
          break;
        }
      }
      if (!options.autoDetectHeader || rowWithColumnHeaders === undefined) {
        for (var i = 0; i < maxCols; i++) columns.push(i+'');
      } else {
        var columns = _.map(lines[rowWithColumnHeaders].split('\t'), function(s) {
          return s.trim();
        });
      }
      Backbone.InputModel.setColumns(columns);

      _.each(lines, function(row, r) {
        var error;
        if (options.autoDetectHeader && rowWithColumnHeaders !== undefined && rowWithColumnHeaders >= r) {
          error = 'Header row and previous rows will not be processed.';
        }

        var model = new Backbone.InputModel({__Row: r, __Error: error});
        _.each(row.split('\t'), function(cell, c) {
          var value = cell.trim();
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
        this.store.set({text: text.trim('\r\n')});
        this.parsePastedText();
      }.bind(this));

    },

    toRender: function() {
      return _.extend({
        id: this.store.id,
      }, this.store.get('options'));
    },
    render: function() {
      var data = this.toRender();
      this.$el.html(this.template(data));


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
        columns: inputColumns
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
      var csv = escape(this.outputCollection.toCSV(','));
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
      if (error) this.$el.append('&nbsp;<i class="glyphicon glyphicon-warning-sign text-danger" title="' + (error+'').replace(/"/g, "'") + '"></i>');
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
      if (this.model.errorModel) {
        var error = this.model.errorModel.get(columnName);
        if (error) this.$el.prepend('<i class="fa fa-fw fa-warning text-danger" title="' + (error+'').replace(/"/g, "'") + '"></i>&nbsp;');
      }
      this.delegateEvents();
      return this;
    }
  });

  // Serialize a form into an object
  $.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
      if (o[this.name] !== undefined) {
        if (!o[this.name].push) {
          o[this.name] = [o[this.name]];
        }
        o[this.name].push(this.value || '');
      } else {
        o[this.name] = this.value || '';
      }
    });
    return o;
  };

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