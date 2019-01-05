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
              <button class="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button>
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
          <li class="session clearfix <%=id == sessions[i] ? 'active' : ''%>">
            <a class="pull-left" href="/datajanitor/<%=sessions[i]%>" title="Saved to server. Changes are saved to local storage until you click Save again.">
              <i class="glyphicon glyphicon-link"></i>
              &nbsp;
              <%=names[sessions[i]] || sessions[i].substr(0,8)%>
            </a>
            <% if (sessions[i] == id) { %>
              <div class="dropdown session-dropdown">
                <button class="btn btn-default btn-xs pull-right" data-toggle="dropdown"><span class="caret"></span></button>
                <ul class="dropdown-menu">
                  <li><a href="#" class="clear-local-storage" title="Reverts data, options and code changes to the last version saved to the server.">Reset session to server</a></li>
                  <li><a href="#" class="clear-data-options-code" title="Clear data and code to start from scratch.">Clear data and code</a>
                  <li role="separator" class="divider"></li>
                  <li><a href="#" class="rename-session" title="Rename the session"><i class="glyphicon glyphicon-tag"></i>&nbsp;Rename</a></li>
                  <li><a href="#" class="save-session" title="Save changes to server"><i class="glyphicon glyphicon-link"></i>&nbsp;Save</a></li>
                  <li role="separator" class="divider"></li>
                  <li><a href="#" class="delete-session text-danger" title="Permanently delete this session."><i class="glyphicon glyphicon-trash"></i>&nbsp;Delete</a></li>
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
      'click .clear-data': 'onClickClearData'
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
    toRender: function() {
      return _.extend({
        id: this.store.id,
        sessions: this.store.getSessions(),
        names: this.store.getSessionNames()
      }, this.store.get('options'));
    },
    render: function() {
      var data = this.toRender();
      this.$el.html(this.template(data));
      this.$('[data-toggle="tooltip"]').tooltip();

      new Backbone.DeleteView({
        el: this.$('.delete-session'),
        store: this.store
      }).render();

      new Backbone.RenameView({
        el: this.$('.rename-session'),
        store: this.store,
        sessionsView: this
      }).render();

      return this;
    }
  });

  Backbone.DeleteView = Backbone.View.extend({
    modalTemplate: _.template(`
      <div class="modal fade" id="delete-modal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-sm" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
              <h4 class="modal-title text-danger">Delete Session</h4>
            </div>
            <div class="modal-body">
              <p class="text-center">Are you sure you want to delete this session and remove it from the server?</p>
              <p class="status text-center"></p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-danger confirm">Delete</button>
              <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `),
    events: {
      'click': 'onClick'
    },
    initialize: function(options) {
      this.store = options.store;
    },
    onClick: function(e) {
      e.preventDefault();
      $('#delete-modal').modal();
    },
    onConfirm: function() {
      this.renderModalState('deleting');
      this.store.destroy({wait: true})
      .done(function() {
        this.renderModalState('deleted');
        window.location.href = '/datajanitor';
      }.bind(this))
      .fail(function(xhr) {
        var error = xhr.responseText ? xhr.responseText : 'Unexpected error saving.';
        this.renderModalState('error', error);
      }.bind(this));
    },
    renderModalState: function(state, error) {
      var $status = this.$modal.find('p.status');
      var $confirm = this.$modal.find('button.confirm');
      switch (state) {
        case 'deleted':
          $status.html('Deleted from server.');
          break;
        case 'deleting':
          $status.html('<i class="glyphicon glyphicon-refresh glyphicon-spin"></i> Please wait while we remove from server...');
          $confirm.attr('disabled', 'disabled');
          break;
        case 'error':
          $status.html(error ? error : 'An unexpected error while saving.');
          $confirm.attr('disabled', 'disabled');
          break;
      }
      return this;
    },
    render: function() {
      this.$modal = $(this.modalTemplate({}));
      $('body').append(this.$modal);
      this.$modal.on('click', '.confirm', this.onConfirm.bind(this));
      return this;
    }
  });

  Backbone.RenameView = Backbone.View.extend({
    modalTemplate: _.template(`
      <div class="modal fade" id="rename-modal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-sm" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
              <h4 class="modal-title">Rename Session</h4>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <div class="input-group">
                  <label class="form-label">Name</label>
                  <input class="form-control" type="text" name="name" spellcheck="false" placeholder="<%=id%>" value="<%=name%>" />
                </div>
              </div>
              <p class="status text-center"></p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary confirm">Save</button>
              <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `),
    events: {
      'click': 'onClick'
    },
    initialize: function(options) {
      this.store = options.store;
      this.sessionsView = options.sessionsView;
    },
    onClick: function(e) {
      e.preventDefault();
      this.$modal.modal();
    },
    onConfirm: function() {
      var options = _.extend({}, this.store.get('options'), {
        name: this.$modal.find('input[name=name]').val() || null
      });

      this.renderModalState('saving');
      this.store.save({options: options, date: (new Date()).toUTCString()}, {wait: true})
      .done(function() {
        this.renderModalState('saved');
        this.sessionsView.render();
        this.$modal.modal('hide');
      }.bind(this))
      .fail(function(xhr) {
        var error = xhr.responseText ? xhr.responseText : 'Unexpected error saving.';
        this.renderModalState('error', error);
      }.bind(this));
    },
    renderModalState: function(state, error) {
      var $status = this.$modal.find('p.status');
      var $confirm = this.$modal.find('button.confirm');
      switch (state) {
        case 'saved':
          $status.html('Saved to server.');
          break;
        case 'saving':
          $status.html('<i class="glyphicon glyphicon-refresh glyphicon-spin"></i> Please wait while we save to server...');
          $confirm.attr('disabled', 'disabled');
          break;
        case 'error':
          $status.html(error ? error : 'An unexpected error while saving.');
          $confirm.attr('disabled', 'disabled');
          break;
      }
      return this;
    },
    render: function() {
      var id = this.store.id;
      var name = this.store.get('options').name;
      var data = {
        id: id,
        name: id !== name ? name : id
      };

      this.$modal = $(this.modalTemplate(data));
      $('body').append(this.$modal);

      this.$modal.on('click', '.confirm', this.onConfirm.bind(this));
      this.$modal.find('input[name=name]').on('keyup', function(e) {
        if (e.keyCode == 13) this.onConfirm();
      }.bind(this));

      return this;
    }
  });

}.call(this));