/*
 * CSVJSON Data Clean - Backbone.InputView
 * 
 * Copyright (c) 2018 Martin Drapeau
 *
 */
(function() {

  Backbone.InputView = Backbone.View.extend({
    template: _.template(`
      <div class="row">
        <div class="col-md-3">
          <p><strong>Paste (Ctrl+v) your Excel or Google Sheets data here.</strong></p>
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
            Click on the <strong><i class="glyphicon glyphicon-link"></i> Save</strong> link to persist to server in order to share with colleagues.
          </p>
          <br/>
        </div>
        <div class="col-md-9">
          <table class="table table-bordered backgrid"></table>
        </div>
      </div>
    `),
    events: {
      'change input[type=checkbox]': 'onChangeOption'
    },
    initialize: function(options) {
      this.store = options.store;
      $(document).on('paste', this.onPaste.bind(this));
      _.defer(function() {
        this.parsePastedText();
      }.bind(this));
    },

    // Options
    onChangeOption: function(e) {
      var options = {
        autoDetectHeader: false
      };
      var form = this.$('form').serializeObject();
      if (form.autoDetectHeader) options.autoDetectHeader = true;
      this.store.set({options: options});
      this.parsePastedText();
    },

    // Paste and parse
    parsePastedText: function() {
      this.collection.reset();
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
        this.collection.add(model);
      }.bind(this));

      this.collection.trigger('ready');

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
      return this.store.get('options');
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
      _.each(Backbone.InputModel.getColumns(), function(col) {
        columns.push({
          name: col,
          label: col,
          cell: Backgrid.ReportingCell,
          editable: false
        });
      });

      new Backgrid.Grid({
        el: this.$('table'),
        collection: this.collection,
        columns: columns
      }).render();

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
  Backbone.InputCollection = Backbone.Collection.extend({
    model: Backbone.InputModel
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

}.call(this));