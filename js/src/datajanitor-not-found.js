/*
 * CSVJSON Data Janitor - Backbone.NotFoundView
 * 
 * Copyright (c) 2022 Flatfile
 *
 */
(function() {

  Backbone.NotFoundView = Backbone.View.extend({
    template: _.template(`
      <div class="row">
        <div class="col-md-12 text-center">
          <h1>404 Not Found</h1>
          <p class="lead">Oh no!&nbsp;Could not find that session.</p>
          <p class="lead">Jump to your&nbsp;<a href="/datajanitor">Sandbox</a>.</p>
          <% if (sessions.length) { %>
            <p>Or to an existing session:</p>
            <ul class="nav nav-pills nav-stacked">
              <% for (var i = 0; i < sessions.length; i++) { %>
                <li class="session">
                  <a href="/datajanitor/<%=sessions[i]%>">
                    <i class="glyphicon glyphicon-link"></i>
                    &nbsp;
                    <%=names[sessions[i]] || sessions[i].substr(0,8)%>
                  </a>
                </li>
              <% } %>
            </ul>
          <% } %>
        </div>
      </div>
      <br/>
    `),
    initialize: function(options) {
      this.store = options.store;
    },
    toRender: function() {
      return {
        sessions: this.store.getSessions(),
        names: this.store.getSessionNames()
      };
    },
    render: function() {
      var data = this.toRender();
      this.$el.html(this.template(data));
      return this;
    }
  });

}.call(this));