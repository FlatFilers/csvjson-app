/*
 * Backbone.CodeView
 * 
 * Copyright (c) 2018 Martin Drapeau
 *
 * Persists to local storage:
 * - localStorage.DataCleanCode
 *
 */
(function() {

  var defaultCode = `
function process(input, columns) {
  var output = [];
  input.forEach(function(inRow, r) {
    var outRow = {};
    columns.forEach(function(col) {
      var value = inRow[col];
      // Processing here
      outRow[col] = value;
    });
    output.push(outRow);
  });
  return output;
}
`;

  Backbone.CodeView = Backbone.View.extend({
    template: _.template(`
      <div class="row">
        <div class="col-md-6">
          <h4>
            <span>JavaScript</span>
            <button class="btn btn-xs btn-success pull-right run">Run <em>(Ctrl+R)</em></button>
            <button class="btn btn-xs btn-danger pull-right stop hidden"><i class="glyphicon glyphicon-refresh glyphicon-spin"></i> Stop</button>
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
      'click button.stop': 'stop'
    },
    initialize: function(options) {
      this.inputCollection = options.inputCollection;
      this.outputCollection = options.outputCollection;
      this.error = undefined;

      this.listenTo(this.inputCollection, 'ready', this.run);
      this.listenTo(this.outputCollection, 'reset', this.render);

      $(document).find('a[role=tab][href=#tab-code]').on('shown.bs.tab', this.render.bind(this));
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

    // Eval safely using a web worker
    run: function() {
      this.$('button.run').addClass('hidden');
      this.$('button.stop').removeClass('hidden');
      this.clearWorkerErrors();

      // Create a web worker to eval the user code
      this.sandbox = new Worker('/js/src/sandbox.js');

      this.sandbox.addEventListener('message', function(e) {
        this.error = undefined;
        for (var i = 0; i < e.data.length; i++) e.data[i].__Row = i;
        this.outputCollection.reset(e.data);
        this.stop();
      }.bind(this));

      this.sandbox.addEventListener('error', function(e) {
        this.error = e.message;
        this.showWorkerErrors([{message: e.message, lineno: e.lineno}]);
        this.outputCollection.reset();
        this.stop();
      }.bind(this));

      var input = this.inputCollection.reduce(function(l, m) {
        if (!m.get('__Error')) l.push(_.omit(m.toJSON(), '__Error', '__Row'));
        return l;
      }, []);

      var code = (localStorage.DataCleanCode || defaultCode) +
        '\nprocess(' + JSON.stringify(input) + ', ' + JSON.stringify(Backbone.InputModel.getColumns()) + ');';
      this.sandbox.postMessage(code);
    },
    stop: function() {
      this.sandbox.terminate();
      this.$('button.stop').addClass('hidden');
      this.$('button.run').removeClass('hidden');
    },
    clearWorkerErrors: function() {
      if (!this.codeEditor) return;
      this.codeEditor.clearGutter('worker-error');
    },
    showWorkerErrors: function(errors) {
      if (!this.codeEditor) return;
      var lineCount = $(this.codeEditor.getWrapperElement()).find('.CodeMirror-code > div:last-child div.CodeMirror-gutter-elt').text();

      for (var i = 0; i < errors.length; i++) {
        var error = errors[i];
        var lineno = error.lineno - 1;
        if (lineno >= lineCount) lineno = 0;

        var $marker = $('<div class="CodeMirror-lint-marker-error" data-toggle="tooltip" data-placement="right" data-container="body" title="' + error.message + '"></div>');

        this.codeEditor.getDoc().setGutterMarker(lineno, 'worker-error', $marker[0]);
        $marker.tooltip();
      }
    },

    toRender: function() {
      var i = 0;
      var input = this.inputCollection.reduce(function(l, m) {
        if (!m.get('__Error')) {
          if (i < 2) l.push(_.omit(m.toJSON(), '__Row', '__Error'));
          i += 1;
        }
        return l;
      }, []);

      var output = this.outputCollection.reduce(function(l, m, i) {
        if (i < 2) l.push(_.omit(m.toJSON(), '__Row'));
        return l;
      }, []);

      return {
        code: localStorage.DataCleanCode !== undefined ? localStorage.DataCleanCode : defaultCode,
        input: JSON2_mod.stringify(input, null, 2),
        output: JSON2_mod.stringify(output, null, 2),
        error: this.error
      };
    },
    render: function() {
      if (!this.$el.hasClass('active in')) return this;

      var data = this.toRender();

      // Render DOM elements only once
      if (this.$el.is(':empty')) {
        this.$el.html(this.template(data));

        this.codeEditor = CodeMirror.fromTextArea(this.$('textarea.code')[0], {
          lineNumbers: true,
          mode: 'text/javascript',
          styleActiveLine: true,
          gutters: ['CodeMirror-lint-markers', 'worker-error'],
          lint: true
        });
        this.codeEditor.setSize('100%', '100%');
        this.codeEditor.on('change', function(editor) {
          localStorage.DataCleanCode = editor.getDoc().getValue();
        });

        this.inputEditor = CodeMirror.fromTextArea(this.$('textarea.input')[0], {
          mode: 'application/json'
        });
        this.inputEditor.setSize('100%', '100%');

        this.outputEditor = CodeMirror.fromTextArea(this.$('textarea.output')[0], {
          mode: 'application/json'
        });
        this.outputEditor.setSize('100%', '100%');

        this.run();

        return this;
      }

      // Update existing elements
      this.inputEditor.getDoc().setValue(data.input);
      this.outputEditor.getDoc().setValue(this.error || data.output);
      this.outputEditor.setOption('lineWrapping', !!this.error);

      return this;
    }
  });
  
}.call(this));