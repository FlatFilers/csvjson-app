<div class="container-fluid">
  <div class="row">
    <div class="description col-md-12">
      <h1 class="discrete">Online tool to convert your CSVJSON formatted data to JSON.</h1>
      <p>1) Copy/paste or upload your CSVJSON data to convert it to JSON. 2) Convert and copy/paste back to your computer. 3) Save your result for later or for sharing.</p>
    </div>
  </div>
  
  <div class="row">
    <div class="col-md-5 more-bottom-margin">
      <div class="form-group">
        <label>Upload a CSVJSON file</label>
        <span class="btn btn-default fileinput-button form-control">
          <label>
            <i class="glyphicon glyphicon-plus"></i>
            <span>Select a file...</span>
          </label>
          <input id="fileupload" type="file" name="file" />
        </span>
      </div>
      <div class="form-group code-group">
        <label>Or paste your CSVJSON here</label>
<textarea id="csv" class="form-control input save" rows="18">
"index","value1","value2"
"number",1,2
"boolean",false,true
"null",null,"non null"
"array of numbers",[1],[1,2]
"simple object",{"a": 1},{"a":1, "b":2}
"array mixed objects",[1,null,"ball"],[2,{"a": 10, "b": 20},"cube"]
"string with quotes","a\"b","alert(\"Hi!\")"
"string with bell&newlines","bell is \u0007","multi\nline\ntext"
</textarea>
      </div>
      <button id="convert" type="submit" class="btn btn-primary">
        <i class="glyphicon glyphicon-chevron-right"></i> Convert
      </button>
      <button id="clear" type="submit" class="btn">
        <i class="glyphicon glyphicon-remove"></i> Clear
      </button>
    </div>
    
    <div class="col-md-7 more-bottom-margin">
      <div class="form-group">
        <label>Options <small>Hover on option for help</small></label>
        <div class="form-control options">
          <label class="inline" title="Minify or compact result by removing spaces and new lines.">
            <input type="checkbox" id="minify" name="minify" class="save" /> Minify
          </label>
        </div>
      </div>
      <?php $this->load->view('result_textarea_buttons_view', array('result_title' => 'JSON', 'download' => 'csvjson.json')); ?>
    </div>
  </div>
  <div class="row">
    <div class="col-md-8">
      <h4>About the CSVJSON format (variant of CSV)</h4>
      <ul>
        <li>
          CSV values are plain text strings. Dror Harari proposed a variant called CSVJSON (<a href="http://csvjson.org/" target="_blank">csvjson.org</a>). The variant proposes that every CSV value be a valid JSON value. More specifically, objects and arrays would not be wrapped in double quotes but output as is.
        </li>
        <li>
          CSVJSON format variant is not valid CSV however every value is valid JSON. Parsing CSVJSON is done by processing one line at a time. Wrap a line with square brackets <code>[]</code> and use <code>JSON.parse()</code> to convert to a JSON array.
        </li>
        <li>
          Dror Harari: <em>"The reason why I came up with CSVJSON was not to allow embedding of JSON objects in a CSV line, that's a nice benefit but my main reason was to have the very well defined encoding semantics of JSON (as per json.org) be used to describe CSV lines (just taking out the [ and ])."</em>
        </li>
      </ul>
      <h4>Change Log</h4>
      <ul>
        <li><strong>Apr 2, 2018</strong> First release.</li>
      </ul>
      <?php $this->load->view('feedback'); ?>
    </div>
    <div class="col-md-4">
      <?php
        $this->load->view('carbonads');
        //$this->load->view(rand(1,2) == 1 ? "ludo" : "miamboom");
      ?>
    </div>
  </div>
</div>
