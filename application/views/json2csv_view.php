<div class="container-fluid">
	<div class="row">
		<div class="description col-md-12">
      <h1 class="discrete">Convert your JSON to CSV or TSV formatted data. </h1>
			<p>1) Copy/paste or upload your JSON to convert it. 2) Choose your separator. 3) For Excel, convert to TSV then copy and paste into Excel. 4) Save your result for later or for sharing.</p>
		</div>
	</div>
	
	<div class="row">
		<div class="col-md-5 more-bottom-margin">
			<div class="form-group">
				<label>Upload a JSON file</label>
				<span class="btn btn-default fileinput-button form-control">
					<label>
						<i class="glyphicon glyphicon-plus"></i>
						<span>Select a file...</span>
					</label>
					<input id="fileupload" type="file" name="file" />
				</span>
			</div>
			<div class="form-group code-group">
				<label>Or paste your JSON here</label>
				<textarea id="json" class="form-control input save" rows="18" spellcheck="false">[
  {
    "album": "The White Stripes",
    "year": 1999,
    "US_peak_chart_post": "-"
  },
  {
    "album": "De Stijl",
    "year": 2000,
    "US_peak_chart_post": "-"
  },
  {
    "album": "White Blood Cells",
    "year": 2001,
    "US_peak_chart_post": 61
  },
  {
    "album": "Elephant",
    "year": 2003,
    "US_peak_chart_post": 6
  },
  {
    "album": "Get Behind Me Satan",
    "year": 2005,
    "US_peak_chart_post": 3
  },
  {
    "album": "Icky Thump",
    "year": 2007,
    "US_peak_chart_post": 2
  },
  {
    "album": "Under Great White Northern Lights",
    "year": 2010,
    "US_peak_chart_post": 11
  },
  {
    "album": "Live in Mississippi",
    "year": 2011,
    "US_peak_chart_post": "-"
  },
  {
    "album": "Live at the Gold Dollar",
    "year": 2012,
    "US_peak_chart_post": "-"
  },
  {
    "album": "Nine Miles from the White City",
    "year": 2013,
    "US_peak_chart_post": "-"
  }
]</textarea>
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
					<label class="inline save" title="Choose your separator">
						Separator
						<select id="separator" name="separator">
							<option value="comma" selected="selected">Comma (CSV)</option>
							<option value="tab">Tab (TSV)</option>
							<option value="semiColon">Semi-colon (CSV French)</option>
						</select>
					</label>
          &nbsp;
          <label class="inline" title="Flattens nested arrays of objects">
            <input type="checkbox" id="flatten" name="flatten" class="save" /> Flatten
          </label>
          &nbsp;
          <label class="inline" title="Output the CSVJSON variant format. If checked, will not wrap values that are arrays or objects with double quotes.">
            <input type="checkbox" id="output_csvjson_variant" name="output_csvjson_variant" class="save" /> Output CSVJSON variant
          </label>
				</div>
			</div>
      <?php $this->load->view('result_textarea_buttons_view', array('result_title' => 'Result', 'download' => 'csvjson.csv')); ?>
		</div>
	</div>
	<div class="row">
		<div class="col-md-8">
      <h4>Node.js</h4>
      <p>This function is available as a <a href="https://www.npmjs.com/package/csvjson-json2csv" target="_blank">npm package</a>.</p>

			<h4>About CSV, TSV and Excel</h4>
			<ul>
				<li>
					CSV stands for <a href="http://en.wikipedia.org/wiki/Comma-separated_values" target="_blank">Comma Separated Values</a>.
					Often used as an interchange data format to represent table records, one per line. CSV is plain text.
				</li>
				<li>
					TSV or Tab Separated Values is used to store table data in the Clipboard.
          You can then copy (Ctrl+C) and paste (Ctrl+V) it into Excel.
				</li>
        <li>
          In French, Excel will expect a semi-colons <code>;</code> instead of a comma <code>,</code>.
          Make sure to pick that option if you are going to import the CSV file in Excel.
        </li>
			</ul>
      <h4>About JSON to CSV</h4>
      <ul>
        <li>
          JSON to CSV will convert an array of objects into a table. By default, nested arrays or objects will simply be stringified and copied as is in each cell. Alternatively, you can flatten nested arrays of objects as requested by <a href="https://github.com/rogeriomarques" target="_blank">Rogerio Marques</a> in <a href="https://github.com/martindrapeau/csvjson-app/issues/3" target="_blank">Github issue #3</a>.
        </li>
      </ul>
      <h4>CSVJSON format variant</h4>
      <ul>
        <li>
          CSV values are plain text strings. Dror Harari proposed a variant called CSVJSON (<a href="http://csvjson.org/" target="_blank">csvjson.org</a>). The variant proposes that every CSV value be a valid JSON value. More specifically, objects and arrays would not be wrapped in double quotes but output as is. Toggle the switch <em>Output CSVJSON variant</em> to output that format.
        </li>
        <li>
          CSVJSON format variant is not valid CSV however every value is valid JSON. Parsing CSVJSON is done by processing one line at a time. Wrap a line with square brackets <code>[]</code> and use <code>JSON.parse()</code> to convert to a JSON array.
        </li>
        <li>
          To convert from CSVJSON back to JSON, use the companion tool <a href="/csvjson2json">CSVJSON to JSON</a>.
        </li>
        <li>
            Dror Harari: <em>"The reason why I came up with CSVJSON was not to allow embedding of JSON objects in a CSV line, that's a nice benefit but my main reason was to have the very well defined encoding semantics of JSON (as per json.org) be used to describe CSV lines (just taking out the [ and ])."</em>
        </li>
      </ul>
			<h4>Change Log</h4>
			<ul>
        <li><strong>Jul 15, 2019</strong> Fixed bug where BOM was missing causing the lost of accented characters in Excel. <a href="https://github.com/martindrapeau/csvjson-app/issues/78">GitHub issue #78</a>.</li></li>
        <li><strong>June 6, 2019</strong> Fixed bug where uploading a file went to the result box instead of the json box. <a href="https://github.com/martindrapeau/csvjson-app/issues/75">GitHub issue #75</a>.</li>
        <li><strong>Feb 3, 2019</strong> Refactored and published <a href="https://www.npmjs.com/package/csvjson-json2csv" target="_blank">npm package json2csv</a>.</li>
        <li><strong>Jan 26, 2019</strong> Removed 64k limit on download button. Also fixed mime type.</li>
        <li><strong>Mar 31, 2018</strong> CSVJSON format variant support: ensure CSV values are JSON valid.</li>
				<li><strong>Jan 24, 2018</strong> Initial release.</li>
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
