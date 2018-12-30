/*
 * CSVJSON Data Janitor - Backbone.SessionsView
 * 
 * Copyright (c) 2018 Martin Drapeau
 *
 */
(function() {

  Backbone.SessionsView = Backbone.View.extend({
    template: _.template(`
      <h3>Sessions</h3>
      <ul class="nav nav-pills nav-stacked">
        <li class="session clearfix <%=!id ? 'active' : ''%>">
          <a class="pull-left" href="/datajanitor" title="Saved to local storage. Never sent to the server.">Sandbox</a>
          <% if (!id) { %>
            <div class="dropdown session-dropdown">
              <button class="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown"><i class="glyphicon glyphicon-option-vertical"></i></button>
              <ul class="dropdown-menu dropdown-menu-left">
                <li><a href="#" class="clear-local-storage" title="Resets data, options and code to the original example.">Reset sandbox to example</a></li>
                <li><a href="#" class="clear-data-options-code" title="Clear data and code to start from scratch.">Clear data and code</a>
                <li role="separator" class="divider"></li>
                <li><a href="#" class="save-session" title="Save a permalink to share with a colleague."><i class="glyphicon glyphicon-link"></i>&nbsp;Save</a></li>
              </ul>
            </div>
          <% } %>
        </li>
        <% for (var i = 0; i < sessions.length; i++) { %>
          <li class="session <%=id == sessions[i] ? 'active' : ''%>">
            <a class="pull-left" href="/datajanitor/<%=sessions[i]%>" title="Saved to server. Changes are saved to local storage until you click Save again.">
              <i class="glyphicon glyphicon-link"></i>
              &nbsp;
              <%=sessions[i].substr(0,8)%>
            </a>
            <% if (sessions[i] == id) { %>
              <div class="dropdown session-dropdown">
                <button class="btn btn-default btn-xs pull-right" data-toggle="dropdown"><span class="caret"></span></button>
                <ul class="dropdown-menu">
                  <li><a href="#" class="clear-local-storage" title="Reverts data, options and code changes to the last version saved to the server.">Reset session to server</a></li>
                  <li><a href="#" class="clear-data-options-code" title="Clear data and code to start from scratch.">Clear data and code</a>
                  <li role="separator" class="divider"></li>
                  <li><a href="#" class="save-session" title="Save changes to server"><i class="glyphicon glyphicon-link"></i>&nbsp;Save</a></li>
                  <!--<li role="separator" class="divider"></li>
                  <li><a href="#" class="delete-session text-danger" title="Permanently delete this session."><i class="glyphicon glyphicon-trash"></i>&nbsp;Delete</a></li>-->
                </ul>
              </div>
            <% } %>
          </li>
        <% } %>
      </ul>
      <br/>
      <div class="panel">
        <p><em>Current session is auto-saved&nbsp;<i class="glyphicon glyphicon-info-sign text-muted" data-toggle="tooltip" data-placement="bottom" title="Your input data and code is auto-saved to local storage. Click on the Save link to persist to server in order to share with colleagues."></i></em></p>
      </div>
    `),
    events: {
      'click .clear-local-storage': 'onClickClearLocalStorage',
      'click .clear-data-options-code': 'onClickClearDataOptionsCode',
      'click .clear-data': 'onClickClearData',
      'click .delete-session': 'onClickDeleteSession'
    },
    initialize: function(options) {
      this.store = options.store;
    },
    onClickClearLocalStorage: function(e) {
      e.preventDefault();
      this.store.clearLocalStorage();
      window.location.reload();
    },
    onClickClearDataOptionsCode: function(e) {
      e.preventDefault();
      this.store.clearDataOptionsCode();
      window.location.reload();
    },
    onClickClearData: function(e) {
      e.preventDefault();
      this.store.clearData();
      window.location.reload();
    },
    onClickDeleteSession: function(e) {
      e.preventDefault();

    },
    toRender: function() {
      return _.extend({
        id: this.store.id,
        sessions: this.store.getSessions()
      }, this.store.get('options'));
    },
    render: function() {
      var data = this.toRender();
      this.$el.html(this.template(data));
      this.$('[data-toggle="tooltip"]').tooltip();
      return this;
    }
  });

}.call(this));