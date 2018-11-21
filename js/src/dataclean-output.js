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
          <h4>Instructions</h4>
          <p>Copy data and paste back in Excel or Google Sheets.</p>
          <br/>
          <div class="row">
            <div class="col-xs-9">
              <button class="btn btn-primary btn-block"><i class="glyphicon glyphicon-download"></i> Download CSV</button>
              <br/>
              <button class="btn btn-primary btn-block"><i class="glyphicon glyphicon-share"></i> Copy to clipboard</button>
            </div>
          </div>
          <br/>
        </div>
      </div>
    `),
    initialize: function(options) {
      $(document).find('a[role=tab][href=#tab-output]').on('shown.bs.tab', this.render.bind(this));
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
        var keys = _.omit(this.collection.first().keys(), '__Row');
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

      return this;
    }
  });
 
  Backbone.OutputModel = Backbone.Model.extend({
    defaults: {
      __Row: null
    }
  });
  Backbone.OutputCollection = Backbone.Collection.extend({
    model: Backbone.OutputModel
  });
  
}.call(this));