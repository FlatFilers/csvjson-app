/*
 * CSVJSON Data Clean - Backbone.CodeView
 * 
 * Copyright (c) 2018 Martin Drapeau
 *
 */
(function() {

  Backbone.CodeView = Backbone.View.extend({
    template: _.template(`
      <div class="row">
        <div class="col-md-6">
          <h4>
            <span>JavaScript</span>
            <div class="form-inline pull-right">
              <button class="btn btn-xs btn-success run">Run <em>(Ctrl+R)</em></button>
              <button class="btn btn-xs btn-danger stop hidden"><i class="glyphicon glyphicon-refresh glyphicon-spin"></i> Stop</button>
              &nbsp;&nbsp;
              <button class="btn btn-xs btn-default text-danger clear-code" data-toggle="tooltip" data-placement="top" title="Clear code to start from scratch.">Clear</button>
            </div>
          </h4>
          <textarea class="code"><%=code%></textarea>
        </div>
        <div class="col-md-3">
          <h4>Input <small>2 first rows</small></h4>
          <textarea class="input"><%=input%></textarea>
        </div>
        <div class="col-md-3">
          <h4>Output <small>2 first rows</small></h4>
          <textarea class="output"><%=output%></textarea>
        </div>
      </div>
    `),
    events: {
      'click button.run': 'run',
      'click button.stop': 'stop',
      'click button.clear-code': 'onClickClearCode'
    },
    initialize: function(options) {
      this.store = options.store;
      this.inputCollection = options.inputCollection;
      this.outputCollection = options.outputCollection;
      this.error = undefined;
      this.workerErrors = [];

      this.listenTo(this.inputCollection, 'ready', this.run);
      this.listenTo(this.outputCollection, 'reset', this.render);

      this.$tab = $(document).find('a[role=tab][href=#tab-code]');
      this.$tab.on('shown.bs.tab', this.render.bind(this));
      $(window).on('keydown', this.onKeydownCtrlR.bind(this));
    },
    onKeydownCtrlR: function(e) {
      if ($('#tab-code').is(':visible') &&
          (e.ctrlKey || e.metaKey) &&
          String.fromCharCode(event.which).toLowerCase() == 'r') {
        e.preventDefault();
        this.run();
      }
    },
    onClickClearCode: function() {
      this.store.clearCode();
      localStorage.DataCleanShowCodePage = true;
      window.location.reload();
    },

    // Eval safely using a web worker
    run: function() {
      this.$('button.run').addClass('hidden');
      this.$('button.stop').removeClass('hidden');

      // Create a web worker to eval the user code
      this.workerErrors = [];
      this.sandbox = new Worker('/js/src/sandbox.js');

      this.sandbox.addEventListener('message', function(e) {
        this.error = undefined;
        for (var i = 0; i < e.data.length; i++) e.data[i].__Row = i;
        this.outputCollection.fullCollection.reset(e.data);
        this.stop();
      }.bind(this));

      this.sandbox.addEventListener('error', function(e) {
        this.error = e.message;
        this.workerErrors = [{message: e.message, lineno: e.lineno}];
        this.outputCollection.fullCollection.reset();
        this.stop();
      }.bind(this));

      var input = this.inputCollection.fullCollection.reduce(function(l, m) {
        if (!m.get('__Error')) l.push(_.omit(m.toJSON(), '__Error', '__Row'));
        return l;
      }, []);

      var code = this.store.get('code') +
        '\nprocess(' + JSON.stringify(input) + ', ' + JSON.stringify(Backbone.InputModel.getColumns()) + ');';
      this.sandbox.postMessage(code);
    },
    stop: function() {
      this.sandbox.terminate();
      this.$('button.stop').addClass('hidden');
      this.$('button.run').removeClass('hidden');
    },

    toRender: function() {
      var i = 0;
      var input = this.inputCollection.fullCollection.reduce(function(l, m) {
        if (!m.get('__Error')) {
          if (i < 2) l.push(_.omit(m.toJSON(), '__Row', '__Error'));
          i += 1;
        }
        return l;
      }, []);

      var output = this.outputCollection.fullCollection.reduce(function(l, m, i) {
        if (i < 2) l.push(_.omit(m.toJSON(), '__Row'));
        return l;
      }, []);

      return {
        code: this.store.get('code'),
        input: JSON2_mod.stringify(input, null, 2),
        output: JSON2_mod.stringify(output, null, 2),
        error: this.error
      };
    },
    renderWorkerErrors: function() {
      if (!this.codeEditor || !this.$el.hasClass('active in')) return;
      this.codeEditor.clearGutter('worker-error');
      var lineCount = $(this.codeEditor.getWrapperElement()).find('.CodeMirror-code > div:last-child div.CodeMirror-gutter-elt').text();

      for (var i = 0; i < this.workerErrors.length; i++) {
        var error = this.workerErrors[i];
        var lineno = error.lineno - 1;
        if (lineno >= lineCount) lineno = 0;

        var $marker = $('<div class="CodeMirror-lint-marker-error worker-error" data-toggle="tooltip" data-placement="right" data-container="body" title="' + error.message + '"></div>');

        this.codeEditor.getDoc().setGutterMarker(lineno, 'worker-error', $marker[0]);
        $marker.tooltip();
      }
    },
    render: function() {
      if (this.error) {
        this.$tab.html('<small class="text-danger" title="' + this.error + '"><i class="glyphicon glyphicon-exclamation-sign"></i></small> Clean &amp; Transform');
      } else {
        this.$tab.html('Clean &amp; Transform');
      }

      if (!this.$el.hasClass('active in')) return this;

      var data = this.toRender();

      // Render DOM elements only once
      if (this.$el.is(':empty')) {
        this.$el.html(this.template(data));
        this.$('[data-toggle="tooltip"]').tooltip();

        this.codeEditor = CodeMirror.fromTextArea(this.$('textarea.code')[0], {
          lineNumbers: true,
          mode: 'text/javascript',
          styleActiveLine: true,
          gutters: ['CodeMirror-lint-markers', 'worker-error'],
          lint: true,
          indentUnit: 2
        });
        this.codeEditor.setSize('100%', '100%');
        this.codeEditor.on('change', function(editor) {
          this.store.set({code: editor.getDoc().getValue()});
        }.bind(this));

        this.inputEditor = CodeMirror.fromTextArea(this.$('textarea.input')[0], {
          mode: 'application/json',
          indentUnit: 2
        });
        this.inputEditor.setSize('100%', '100%');

        this.outputEditor = CodeMirror.fromTextArea(this.$('textarea.output')[0], {
          mode: 'application/json',
          indentUnit: 2
        });
        this.outputEditor.setSize('100%', '100%');

        this.run();

        return this;
      }

      // Update existing elements
      this.inputEditor.getDoc().setValue(data.input);
      this.outputEditor.getDoc().setValue(this.error || data.output);
      this.outputEditor.setOption('lineWrapping', !!this.error);
      this.renderWorkerErrors();

      return this;
    }
  });
  
}.call(this));