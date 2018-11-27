/*
 * CSVJSON Data Clean - Backbone.ShareView
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
              <p>Your session has been saved. Copy this URL to share with a colleague or save for later.</p>
              <div class="form-group">
                <input class="form-control" type="text" name="share-link" value="Some link" />
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
      this.listenTo(this.store, 'change:options change:text change:code', this.onChange);
    },
    onChange: function() {
      APP.renderSave('active');
    },
    onClick: function(e) {
      e.preventDefault();
      if (this.$el.closest('li').hasClass('disabled')) return false;
      //$('#share-modal').modal();
      this.save();
    },
    save: function() {
      APP.renderSave('saving');
      this.store.save({date: (new Date()).toUTCString()}, {wait: true})
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
        this.renderSaveLink();
      }.bind(this))
      .fail(function(xhr) {
        var error = xhr.responseText ? xhr.responseText : 'Unexpected error saving.';
        APP.renderSave('error', error);
      }.bind(this));
    },
    renderSaveLink: function() {
      if (APP.id && APP.data &&
          APP.id == this.store.id &&
          APP.data.text == this.store.get('text') &&
          APP.data.code == this.store.get('code') &&
          _.isEqual(APP.data.options, this.store.get('options'))) {
        APP.renderSave('saved');
      } else {
        this.undelegateEvents();
        APP.renderSave('active');
        this.$el.unbind('click');
        this.delegateEvents();
      }
    },
    render: function() {
      if ($('#share-modal').length == 0) $('body').append(this.modalTemplate({}));
      this.renderSaveLink();
      return this;
    }
  });

}.call(this));