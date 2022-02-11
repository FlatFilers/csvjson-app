<div class="container px-4 py-5">
	<div class="row">
		<div class="description col-md-12">
      <h1 class="text-primary fw-bold">JSON <small class="bi bi-chevron-right"></small>CSV or TSV</h1>
			<p>To get started, upload or paste your JSON.
		</div>
	</div>

	<div class="row">
		<div class="col-md-5 more-bottom-margin">
			<div class="mb-5">
			<label class="form-label">Upload a JSON file</label>
					<input id="fileupload" type="file" name="file" class="form-control"/>
			</div>
			<div class="mb-3">
				<label class="form-label">Or paste your JSON here</label>
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
				<i class="bi bi-chevron-right"></i> Convert
			</button>
			<button id="clear" type="submit" class="btn btn-light">
				<i class="bi bi-backspace"></i> Clear
			</button>
		</div>

		<div class="col-md-7 more-bottom-margin">
			<div class="mb-5">
				<div class="form-check-inline">
					<label class="form-label me-2 save" title="Choose your separator">
						<div class="mb-2">Separator</div>
						<select id="separator" name="separator" class="form-select">
							<option value="comma" selected="selected">Comma (CSV)</option>
							<option value="tab">Tab (TSV)</option>
							<option value="semiColon">Semi-colon (CSV French)</option>
						</select>
					</label>
          <label class="form-check-label me-2" title="Flattens nested arrays of objects">
            <input type="checkbox" id="flatten" name="flatten" class="form-check-input save" /> Flatten
          </label>
          <label class="form-check-label me-2" title="Output the CSVJSON variant format. If checked, will not wrap values that are arrays or objects with double quotes.">
            <input type="checkbox" id="output_csvjson_variant" name="output_csvjson_variant" class="form-check-input save" /> Output CSVJSON variant
          </label>
				</div>
			</div>
      <?php $this->load->view('result_textarea_buttons_view', array('result_title' => 'Result', 'download' => 'csvjson.csv')); ?>
		</div>
	</div>
</div>

<div class="container px-4 py-5" id="about-flatfile">

	<h2 class="pb-2 border-bottom">Need help cleaning data?</h2>

	<div class="row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4 py-5">
	  <div class="col d-flex align-items-start">
	    <div>
				<p>
					Embed all the functionality of csv<strong>json</strong> in any web application with <a href="https://flatfile.com/get-started?utm_source=csvjson-tools&amp;utm_medium=header&amp;utm_campaign=q1-2022-csvjson-redesign&amp;ajs_event=came_from_csvjson&amp;ajs_prop_ccf_id=b8cdef6a-602c-4993-890c-752924b5ac2a&amp;__hstc=191284213.17efec156b05b5f65379d478482fed10.1642435230343.1643637413336.1644345002104.7&amp;__hssc=191284213.2.1644345002104&amp;__hsfp=668737353">Flatfile</a>. Auto-match columns, validate data fields, and provide an intuitive CSV import experience.
				</p>
			</div>
		</div>
	</div>

</div>

<div class="container px-4 py-5" id="about-csvjson">

  <h2 class="pb-2 border-bottom">More Details</h2>

  <div class="row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4 py-5">
    <div class="col d-flex align-items-start">
      <div>
				<ul>
					<li>
						This function is available as a <a href="https://www.npmjs.com/package/csvjson-json2csv" target="_blank">npm package</a>.
					</li>
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
						JSON to CSV will convert an array of objects into a table. By default, nested arrays or objects will simply be stringified and copied as is in each cell. Alternatively, you can flatten nested arrays of objects as requested by <a href="https://github.com/rogeriomarques" target="_blank">Rogerio Marques</a> in <a href="https://github.com/FlatFilers/csvjson-app/issues/3" target="_blank">GitHub issue #3</a>.
					</li>
				</ul>
				<h4>CSVJSON format variant</h4>
				<ul>
					<li>
						CSV values are plain text strings. Dror Harari proposed a variant called CSVJSON (<a href="http://csvjson.org/" target="_blank">csvjson.org</a>). The variant proposes that every CSV value be a valid JSON value. More specifically, objects and arrays would not be wrapped in double quotes but output as is. Toggle the switch <em>Output CSVJSON variant</em> to output that format.
					</p>
					<li>
						CSVJSON format variant is not valid CSV however every value is valid JSON. Parsing CSVJSON is done by processing one line at a time. Wrap a line with square brackets <code>[]</code> and use <code>JSON.parse()</code> to convert to a JSON array.
					</p>
					<li>
						To convert from CSVJSON back to JSON, use the companion tool <a href="/csvjson2json">CSVJSON to JSON</a>.
					</p>
					<li>
							Dror Harari: <em>"The reason why I came up with CSVJSON was not to allow embedding of JSON objects in a CSV line, that's a nice benefit but my main reason was to have the very well defined encoding semantics of JSON (as per json.org) be used to describe CSV lines (just taking out the [ and ])."</em>
					</p>
				</ul>
				<p>
					<a class="btn btn-light" data-bs-toggle="collapse" href="#collapseOne" role="button" aria-expanded="false" aria-controls="collapseExample">
						View Change Log
					</a>
				</p>
      </div>
    </div>


		<div id="collapseOne" class="accordion-collapse collapse showclass row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4">
			    <div class="col d-flex align-items-start">
						<div>
							<h5>Jul 15, 2019</h5><p> Fixed bug where BOM was missing causing the lost of accented characters in Excel. <a href="https://github.com/FlatFilers/csvjson-app/issues/78">GitHub issue #78</a>.</p></p>
							<h5>June 6, 2019</h5><p> Fixed bug where uploading a file went to the result box instead of the json box. <a href="https://github.com/FlatFilers/csvjson-app/issues/75">GitHub issue #75</a>.</p>
							<h5>Feb 3, 2019</h5><p> Refactored and published <a href="https://www.npmjs.com/package/csvjson-json2csv" target="_blank">npm package json2csv</a>.</p>
							<h5>Jan 26, 2019</h5><p> Removed 64k limit on download button. Also fixed mime type.</p>
							<h5>Mar 31, 2018</h5><p> CSVJSON format variant support: ensure CSV values are JSON valid.</p>
							<h5>Jan 24, 2018</h5><p> Initial release.</p>
						</div>

			      </div>
			    </div>

  </div>

</div>
