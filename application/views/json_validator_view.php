<div class="container px-4 py-5">
  <div class="row">
    <div class="description col-md-12">
      <h1 class="discrete">Online tool for validating and formatting your JSON.</h1>
      <p>1) Copy/paste or upload your JSON. 2) Validate and format your JSON. 3) Save your result for later or for sharing.</p>
    </div>
  </div>

  <div class="row">
    <div class="col-sm-12">
      <div class="form-group">
        <label>Upload a file</label>
        <span class="btn btn-default fileinput-button form-control">
          <label>
            <i class="glyphicon glyphicon-plus"></i>
            <span>Select a file...</span>
          </label>
          <input id="fileupload" type="file" name="file" />
        </span>
      </div>
    </div>
    <!--<div class="col-sm-6">
      <div class="form-group">
        <label>From URL</label>
        <input class="form-control" id="from-url" type="text" placeholder="Paste URL" />
      </div>
    </div>-->
  </div>

  <div class="row">

    <div class="col-sm-12">
      <div class="form-group code-group">
        <label>JSON</label>
        <textarea id="result" class="form-control result save" rows="14" placeholder="Paste your JSON here"></textarea>
      </div>
    </div>

  </div>

  <div class="row">
    <div class="col-sm-12">
      <div class="clearfix more-bottom-margin">
        <button id="convert" type="submit" class="btn btn-primary action">
          <i class="glyphicon glyphicon-chevron-right"></i> Format
        </button>
        <button id="clear" type="submit" class="btn">
          <i class="glyphicon glyphicon-remove"></i> Clear
        </button>
        <a id="issue" class="btn btn-default pull-right" href="#" tabindex="0" role="button" data-toggle="popover" title= "Found an issue? Want an improvement?">Bug or suggestion?</a>
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col-sm-12">
      <div class="form-group">
        <label>Result</label>
        <div id="status" class="alert alert-default"></div>
      </div>
    </div>
  </div>

  <br/>
  <div class="row">
    <div class="col-md-12 about">
      <h4>About JSON Validator</h4>
      <ul>
        <li>
          JSON Validator verifies that your <strong>JavaScript Object Notation</strong> adheres to the JSON specification: <a href="http://www.json.org" target="_blank">www.json.org</a>.
        </li>
        <li>
          JSON Validator also formats or humanizes your JSON to render it readable following common linting practices such as multi-line and indentation.
        </li>
        <li>
          Looking for more options to format your JSON? Checkout CSVJSON's <a href="/json_beautifier">JSON Beautifier</a>. It has tons of options to make your JSON pretty.
        </li>
        <li>
          Did you know that all browsers have a built-in JSON linter via the global object <code>JSON</code>? Method <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify" target="_blank"><code>JSON.stringify</code></a> implements the validation and formatting of JSON.
        </li>
      </ul>
      <br/>
      <h4>What is Linting?</h4>
      <ul>
        <li>A JSON linter is the combination of validating and formatting JSON performed together.</li>
        <li>
          The term "lint" originates from the <a href="http://www-it.desy.de/cgi-bin/man-cgi?lint+1" target="_blank">UNIX command <code>lint</code></a> <a href="http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.56.1841" target="_blank">"which examines C source programs, detecting a number of bugs and obscurities"</a>. A "linter" is the program which performs "linting" on source code.
        </li>
        <li>
          JSON is a data format and not a programming language. As such, linting JSON is more about validating and then formatting for humans to read more efficiently (splitting on multiple lines and indenting nested values and objects). Nevertheless, the term "lint" is now commonly accepted to encompass both validation and formatting.
        </li>
      </ul>
      <br/>
      <h4>Change Log</h4>
      <ul>
        <li><strong>Sep 12, 2018</strong> Newly added.</li>
      </ul>
      <br/>
    </div>
    <div class="col-md-4">
      <?php //$this->load->view('carbonads'); ?>
    </div>
  </div>
</div>
