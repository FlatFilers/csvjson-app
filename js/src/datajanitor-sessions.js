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
        <li class="<%=!id ? 'active' : ''%>" title="Saved to local storage. Never sent to the server."><a href="/datajanitor">Sandbox</a></li>
        <% for (var i = 0; i < sessions.length; i++) { %>
          <li class="<%=id == sessions[i] ? 'active' : ''%>" title="Saved to server. Changes are saved to local storage until you click Save again."><a href="/datajanitor/<%=sessions[i]%>"><i class="glyphicon glyphicon-link"></i>&nbsp;<%=sessions[i].substr(0,8)%></a></li>
        <% } %>
      </ul>
      <br/>
      <div class="panel">
        <p title="Your input data and code is auto-saved to local storage. Click on the Save link to persist to server in order to share with colleagues."><em>Current session is auto-saved&nbsp;<i class="glyphicon glyphicon-info-sign text-muted"></i></em></p>
        <p>
          <button class="btn btn-default btn-xs text-danger clear-local-storage" data-toggle="tooltip" data-placement="bottom" title="<%= id ? 'Reverts data, options and code changes to the last version saved to the server.' : 'Resets data, options and code to the original example.' %>"><%= id ? 'Reset session to server' : 'Reset sandbox to example'%></button>
        </p>
        <p>
          <button class="btn btn-default btn-xs text-danger clear-data-options-code" data-toggle="tooltip" data-placement="bottom" title="Clear data and code to start from scratch.">Clear data and code</button>
        </p>
      </div>
    `),
    events: {
      'click button.clear-local-storage': 'onClickClearLocalStorage',
      'click button.clear-data-options-code': 'onClickClearDataOptionsCode',
      'click button.clear-data': 'onClickClearData'
    },
    initialize: function(options) {
      this.store = options.store;

    },
    onClickClearLocalStorage: function() {
      this.store.clearLocalStorage();
      window.location.reload();
    },
    onClickClearDataOptionsCode: function() {
      this.store.clearDataOptionsCode();
      window.location.reload();
    },
    onClickClearData: function() {
      this.store.clearData();
      window.location.reload();
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
      return this;
    }
  });

}.call(this));