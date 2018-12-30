/*
 * CSVJSON Data Janitor - Backbone.ShareView
 * 
 * Copyright (c) 2018 Martin Drapeau
 *
 */
(function() {

	Backbone.ShareView = Backbone.View.extend({
    modalTemplate: _.template(`
      <div class="modal fade" id="share-modal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
              <h4 class="modal-title">Save & Share your Session</h4>
            </div>
            <div class="modal-body">
              <p class="status text-center"></p>
              <div class="form-group">
                <div class="input-group">
                  <input class="form-control" type="text" name="share-link" spellcheck="false" />
                  <span class="input-group-btn">
                    <button class="btn btn-default btn-block copy-to-clipboard" onclick="document.execCommand('copy');">
                      <i class="glyphicon glyphicon-share"></i>&nbsp;Copy
                    </button>
                  </span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
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
      this.sessionsView.$('.save-session').on('click', this.onClick.bind(this));
      this.listenTo(this.store, 'change:options change:text change:code', this.onChange);
    },
    onChange: function() {
      APP.renderSave('active');
    },
    onClick: function(e) {
      e.preventDefault();
      $('#share-modal').modal();
      if (this.isDirtyOnServer())
        this.save();
      else
        this.renderModalState('saved');
    },
    isDirtyOnServer: function() {
      var isClean = APP.id && APP.data &&
        APP.id == this.store.id &&
        APP.data.text == this.store.get('text') &&
        APP.data.code == this.store.get('code') &&
        _.isEqual(APP.data.options, this.store.get('options'));
      return !isClean;
    },
    save: function() {
      this.renderModalState('saving');
      this.store.save({date: (new Date()).toUTCString()}, {wait: true})
      .done(function() {
        var newUrl = APP.baseUrl() + '/' + this.store.id;
        APP.id = this.store.id;
        APP.data = this.store.toJSON();
        this.store.saveToLocalStorage();

        if (window.location.href != newUrl) {
          if (window.history && window.history.pushState)
            window.history.pushState("", "", newUrl);
          else
            window.location.href = newUrl;
        }

        this.renderModalState('saved');
        this.sessionsView.render();
      }.bind(this))
      .fail(function(xhr) {
        var error = xhr.responseText ? xhr.responseText : 'Unexpected error saving.';
        this.renderModalState('error', error);
      }.bind(this));
    },
    renderModalState: function(state, error) {
      var $modal = $('#share-modal');
      var $status = $modal.find('p.status');
      var $inputGroup = $modal.find('.input-group');
      var $input = $modal.find('input');
      switch (state) {
        case 'saved':
          $status.html('Saved to server.<br/>Copy the URL to share, or bookmark this page to save for later.');
          $inputGroup.show();
          $input.val(window.location.href);
          _.delay(function() {
            $input[0].select();
          }, 500);
          break;
        case 'saving':
          $status.html('<i class="glyphicon glyphicon-refresh glyphicon-spin"></i> Please wait while we save to server...');
          $inputGroup.hide();
          break;
        case 'error':
          $status.html(error ? error : 'An unexpected error while saving.');
          $inputGroup.hide();
          break;
      }
      return this;
    },
    render: function() {
      if ($('#share-modal').length == 0) {
        $('body').append(this.modalTemplate({}));
      }
      return this;
    }
  });

}.call(this));