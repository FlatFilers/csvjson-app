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
<textarea id="csv" class="form-control input save" rows="18" spellcheck="false">
"index","value1","value2"
"number",1,2
"boolean",false,true
"null",null,"non null"
"array of numbers",[1],[1,2]
"simple object",{"a": 1},{"a":1, "b":2}
"array with mixed objects",[1,null,"ball"],[2,{"a": 10, "b": 20},"cube"]
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
        <li>CSVJSON is a CSV-like text format where each line is a JSON array without the surrounding brackets.</li>
        <li>For data made of numbers and 'simple' strings, CSVJSON looks just like CSV.</li>
        <li>Parsing CSVJSON is done by processing one line at a time. Wrap a line with square brackets [] and use JSON.parse() to convert to a JSON array.</li>
        <li>An explanation of CSVJSON and its benefits can be found at the specification website: <a href="http://csvjson.org" target="_blank">csvjson.org</a></li>
        <li>
          CSVJSON is ideal as a common format for dumping database tables because:
          <ol>
            <li>Being based on UTF-8 it can reliably maintain text from different languages.</li>
            <li>It has a standard concept of nulls.</li>
            <li>It can deal with modern database features like objects and arrays.</li>
            <li>Being based on JSON, there is large variety of high quality formatters and parsers in virtually every programming language.</li>
          </ol>
        </li>
        <li>
          CSVJSON is more expressive than CSV (whose common use is documented by <a href="https://tools.ietf.org/html/rfc4180" tagrget="_blank">RFC-4180</a>. As a result, there are many cases where products and libraries that can read CSV would fail to read CSVJSON due, for example, to escaping rules and embedded objects. Given CSVJSON's simplicity and utility more tools and libraries will support it over time.
        </li>
        <li>
          To convert JSON back to CSVJSON format, use the companion tool <a href="/json2csv">JSON to CSV</a> and toogle the <em>Output CSVJSON variant</em> switch.
        </li>
      </ul>
      <blockquote>
        <p>
          The reason why I came up with CSVJSON was not to allow embedding of JSON objects in a CSV line, that's a nice benefit but my main reason was to have the very well defined encoding semantics of JSON (as per json.org) be used to describe CSV lines (just taking out the [ and ]).
        </p>
        <footer>Dror Harari, <em>author of the CSVJSON format</em></footer>
      </blockquote>
      <h4>Change Log</h4>
      <ul>
        <li><strong>Jan 26, 2019</strong> Improvement: Removed 65k limit on download button.</li>
        <li><strong>Apr 6, 2016</strong> Bug fixes and help text improvements.</li>
        <li><strong>Apr 2, 2018</strong> First release.</li>
      </ul>
      <?php $this->load->view('feedback'); ?>
    </div>
    <div class="col-md-4">
      <?php
        //$this->load->view('carbonads');
        //$this->load->view(rand(1,2) == 1 ? "ludo" : "miamboom");
      ?>
    </div>
  </div>
</div>
