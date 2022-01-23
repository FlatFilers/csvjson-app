/*
 * CSVJSON Data Janitor - Backbone.SessionView
 * 
 * Copyright (c) 2022 Flatfile
 *
 */
(function() {

  Backbone.SessionView = Backbone.View.extend({
    template: _.template(`
      <div class="row">
        <div class="col-md-8">
          <h4>Local Storage</h4>
          <p>
            Your changes are always saved to local storage as you make them.
            If you close your browser, your session will remain and be restored next time you visit this page.
          </p>
        </div>
      </div>
      <br/>

      <div class="row">
        <div class="col-md-8">
          <h4>Saved to server</h4>
          <% if (id) { %>
            <p>
              Your session was last saved: <%=date%>.
              It is available via this permalink.
            </p>
            <div class="form-group">
              <div class="input-group">
                <input class="form-control" type="text" name="share-link" spellcheck="false" value="<%=window.location.href%>" />
                <span class="input-group-btn">
                  <button class="btn btn-default btn-block copy-to-clipboard" onclick="document.execCommand('copy');">
                    <i class="glyphicon glyphicon-share"></i>&nbsp;Copy
                  </button>
                </span>
              </div>
            </div>
          <% } else { %>
            <p>
              Your session can be saved to the server.
              Click on the <em>Save</em> button to get a permalink to share with co-workers.
            </p>
            <div class="form-group">
              <button class="btn btn-primary"><i class="glyphicon glyphicon-link"></i>&nbsp;Save</button>
            </div>
          <% } %>
        </div>
      </div>
      <br/>

      <div class="row">
        <div class="col-md-8">
          <h4>Hire CSVJSON</h4>

        </div>
      </div>
      <br/>
    `),
    events: {
    },
    initialize: function(options) {
      this.store = options.store;

      this.$tab = $(document).find('a[role=tab][href=#tab-session]');
      this.$tab.on('shown.bs.tab', this.render.bind(this));
    },
    toRender: function() {
      return _.extend({
        id: this.store.id,
        date: this.store.get('date')
      }, this.store.get('options'));
    },
    render: function() {
      if (!this.$el.hasClass('active in')) return this;

      var data = this.toRender();
      this.$el.html(this.template(data));
      this.$('[data-toggle="tooltip"]').tooltip();
      return this;
    }
  });

}.call(this));