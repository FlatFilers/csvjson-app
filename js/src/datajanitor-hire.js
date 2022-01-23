/*
 * CSVJSON Data Janitor - Backbone.HireView
 * 
 * Copyright (c) 2022 Flatfile
 *
 */
(function() {

  Backbone.RequestModel = Backbone.Model.extend({
    defaults: {
      state: null,
      error: null,
      deate: null,
      email: null,
      message: null,
      output: null
    },
    urlRoot: '/datajanitor/hire',
    setFromStore: function(store) {
      this.set(_.extend({id: store.id}, store.get('request')));
    }
  });

	Backbone.HireView = Backbone.View.extend({
    modalTemplate: _.template(`
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
            <h4 class="modal-title">Request Data Clean & Transform Service</h4>
          </div>
          <div class="modal-body">
            <% if (isNew) { %>
              <p>
                Please follow these steps to send a request:
              </p>
              <ol>
                <li>Ensure you have copy and pasted the input you want converted.</li>
                <li>Provide your email, instructions and a sample output.</li>
                <li>Click on Save&nbsp;&amp;&nbsp;Submit to send request.</li>
              </ol>
              <p>
                This will save your data, code and request. You will receive an email with a copy of this request.
                Future communications will happen via email.
              </p>
            <% } else { %>
              <p>Request submitted and saved to this URL. An email was sent on <%=store.date%>.</p>
              <div class="form-group">
                <input class="form-control" type="text" name="share-link" spellcheck="false" value="<%=window.location.href%>" />
              </div>
              <p>You may modify and click on Save and Submit to update your request. This will send another email.</p>
              <hr/>
            <% } %>
            <form class="form">
              <div class="form-group">
                <label>Your email</label>
                <input class="form-control" type="email" name="email" placeholder="email@example.com" value="<%=email%>" />
              </div>
              <div class="form-group">
                <label>Instructions and ETA</label>
                <textarea class="form-control" name="message" placeholder="instructions and expected turn around time"><%=message%></textarea>
              </div>
              <div class="form-group">
                <label>Sample output</label>
                <textarea class="form-control" name="output" placeholder="paste a sample output"><%=output%></textarea>
              </div>
            </form>
            <% if (error) { %>
              <div class="alert alert-danger">
                <p><i class="glyphicon glyphicon-exclamation-sign"></i> <%=error%></p>
              </div>
            <% } %>
            <% if (state == 'saved') { %>
              <div class="alert alert-success">
                <p><i class="glyphicon glyphicon-ok-circle"></i>&nbsp;Request saved and sent by email.</p>
              </div>
            <% } %>
          </div>
          <div class="modal-footer">
            <% if (state == 'saving' || state == 'emailing') { %>
              <button type="button" class="btn btn-default" disabled><%=s.titleize(state)%>...</button>
            <% } else if (state != 'saved') { %>
              <button type="button" class="btn btn-default cancel" data-dismiss="modal"><%=state == 'saved' ? 'Close' : 'Cancel'%></button>
              <button type="button" class="btn btn-primary submit">Save&nbsp;&amp;&nbsp;Submit</button>
            <% } %>
          </div>
        </div>
      </div>
    `),
    initialize: function(options) {
      this.store = options.store;
      $('button.hire,a.hire').on('click', this.onClick.bind(this));
      this.model = new Backbone.RequestModel();
      this.model.setFromStore(this.store);
    },
    onClick: function(e) {
      e.preventDefault();
      this.model.set(Backbone.RequestModel.prototype.defaults);
      this.model.setFromStore(this.store);
      this.render();
      this.$modal.modal();
    },
    onClickSubmit: function() {
      var $form = this.$modal.find('form');

      var email = $form.find('input[name=email]').val();
      if (!_.isEmail(email)) {
        this.model.set({state: 'error', error: 'Missing or invalid email'});
        this.render();
        return;
      }

      var message = $form.find('textarea[name=message]').val();
      if (message.trim().length == 0) {
        this.model.set({state: 'error', error: 'Please enter a message'});
        this.render();
        return;
      }

      var output = $form.find('textarea[name=output]').val();

      this.model.set({
        state: 'saving',
        error: null,
        email: email,
        message: message,
        output: output
      });
      this.render();

      this.store.save({
        date: (new Date()).toUTCString(),
        request: {
          email: email,
          message: message,
          output: output
        }
      }, {wait: true})
      .done(function() {
        var newUrl = APP.baseUrl() + '/' + this.store.id;
        if (window.location.href != newUrl) {
          if (window.history && window.history.pushState)
            window.history.pushState("", "", newUrl);
          else
            window.location.href = newUrl;
        }
        APP.id = this.store.id;
        APP.data = this.store.toJSON();
        this.model.set({state: 'emailing', error: null});
        this.render();

        this.model.set({id: this.store.id});
        this.model.save()
        .done(function() {
          this.model.set({state: 'saved', error: null});
          this.render();
        }.bind(this))
        .fail(function(xhr) {
          var error = xhr.responseText ? xhr.responseText : 'Unexpected error emailing.';
          this.model.set({state: 'error', error: error});
          this.render();
        }.bind(this));
      }.bind(this))
      .fail(function(xhr) {
        var error = xhr.responseText ? xhr.responseText : 'Unexpected error saving.';
        this.model.set({state: 'error', error: error});
        this.render();
      }.bind(this));

    },
    toRender: function() {
      var data = _.extend(this.model.toJSON(), {store: this.store.toJSON()});
      var origRequest = data.store.request;
      data.isNew = !origRequest.email;
      return data;
    },
    render: function() {
      if (!this.$modal) {
        this.$modal = $('<div class="modal fade" id="hire-modal" tabindex="-1" role="dialog"></div>');
        $('body').append(this.$modal);
      }
      var data = this.toRender();
      this.$modal.html(this.modalTemplate(data));

      this.$modal.find('form').on('submit', function(e) {
        e.preventDefault();
      });
      this.$modal.find('button.submit').on('click', this.onClickSubmit.bind(this));

      if (!data.isNew) {
        $('.hire-cta-message').text('You sent a service request');
        $('button.hire').text('View/Modify Request');
      }
      
      return this;
    }
  });

}.call(this));