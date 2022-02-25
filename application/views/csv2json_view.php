<div class="container px-4 py-5">
	<div class="row">
		<div class="description col-md-12">
			<h1 class="text-primary fw-bold">CSV or TSV <small class="bi bi-chevron-right"></small>JSON</h1>
			<p>To get started, upload or paste your data from Excel (saved as CSV or TSV).
		</div>
	</div>

	<div class="row gx-5">
		<div class="col-md-5 mb-5">
			<div class="mb-5">
				<label class="form-label">Upload a CSV file</label>
				<input id="fileupload" type="file" name="file" class="form-control"/>
			</div>
			<div class="mb-3">
				<label class="form-label">Or paste your CSV here</label>
<textarea id="csv" class="form-control input save" rows="18" spellcheck="false">
album, year, US_peak_chart_post
The White Stripes, 1999, -
De Stijl, 2000, -
White Blood Cells, 2001, 61
Elephant, 2003, 6
Get Behind Me Satan, 2005, 3
Icky Thump, 2007, 2
Under Great White Northern Lights, 2010, 11
Live in Mississippi, 2011, -
Live at the Gold Dollar, 2012, -
Nine Miles from the White City, 2013, -
</textarea>
			</div>
			<button id="convert" type="submit" class="btn btn-primary mb-2 me-2">
				<i class="bi bi-chevron-right"></i> Convert
			</button>
			<button id="clear" type="submit" class="btn btn-light mb-2 me-2">
				<i class="bi bi-backspace"></i> Clear
			</button>
		</div>

		<div class="col-md-7 more-bottom-margin">
			<div class="mb-3">
				<div class="form-check-inline">
					<label class="form-label me-2 save" title="Choose your separator">
						<div class="mb-2">Separator</div>
						<select class="form-select" id="separator" name="separator">
							<option value="auto" selected="selected">Auto-detect</option>
							<option value="comma">Comma</option>
							<option value="semiColon">Semi-colon</option>
							<option value="tab">Tab</option>
						</select>
					</label>
				</div>
				<div class="form-check-inline">
					<input type="checkbox" id="parseNumbers" name="parseNumbers" class="form-check-input save" checked="checked "/>
					<label class="form-check-label" title="Check to parse numbers (i.e. '7e2' would become 700). Uncheck to keep original formatted numbers as strings.">
						 Parse numbers
					</label>
				</div>
				<div class="form-check-inline">
					<input type="checkbox" id="parseJSON" name="parseJSON" class="form-check-input save" checked="checked "/>
					<label class="form-check-label" title="Check to parse potential values as JSON (numbers, null, false, true, [] and {}). Uncheck to keep original values as strings.">
						 Parse JSON
					</label>
				</div>
				<div class="form-check-inline">
					<input type="checkbox" id="transpose" name="transpose" class="form-check-input save" />
					<label class="form-check-label" title="Transpose the data beforehand.">
						 Transpose
					</label>
				</div>
				<br/>
				<div class="form-check-inline">
					<label class="form-check-label me-2">Output:</label>
					<input type="radio" id="output-array" name="output" class="form-check-input save" value="array" checked="checked" />
					<label class="form-check-label" title="Output an array of objects.">
						Array
					</label>
				</div>
				<div class="form-check-inline">
					<input type="radio" id="output-hash" name="output" class="form-check-input save" value="hash" />
					<label class="form-check-label" title="Output an object instead of an array. First column is used as hash key.">
						Hash
					</label>
				</div>
				<div class="form-check-inline">
					<input type="checkbox" id="minify" name="minify" class="form-check-input save" />
					<label class="form-check-label" title="Minify or compact result by removing spaces and new lines.">
						 Minify
					</label>
				</div>
			</div>
			<?php $this->load->view('result_textarea_buttons_view', array('result_title' => 'JSON', 'download' => 'csvjson.json')); ?>
		</div>
	</div>
</div>



<div class="container px-4 py-5" id="about-flatfile">

	<h2 class="pb-2 border-bottom">Need help cleaning data?</h2>

	<div class="row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4 py-3">
	  <div class="col d-flex align-items-start">
	    <div>
				<p>
					Embed all the functionality of csv<strong>json</strong> in any web application with <a href="https://flatfile.com/get-started?utm_source=csvjson&amp;utm_medium=owned_site&amp;utm_campaign=q1-2022-csvjson-redesign">Flatfile</a>. Auto-match columns, validate data fields, and provide an intuitive CSV import experience.
				</p>
			</div>
		</div>
	</div>

</div>

<div class="container px-4 py-5" id="about-csvjson">

  <h2 class="pb-2 border-bottom">More Details</h2>

  <div class="row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4 py-3">
    <div class="col d-flex align-items-start">
      <div>
					<ul>
						<li>
							This function is available as a <a href="https://www.npmjs.com/package/csvjson-csv2json" target="_blank">npm package</a>
						</li>
						<li>
							CSV stands for <a href="http://en.wikipedia.org/wiki/Comma-separated_values" target="_blank">Comma Separated Values</a>.
							Often used as an interchange data format to represent table records, one per line. CSV is plain text.
						</li>
						<li>
							The CSV format is documented in an RFC memo <a href="https://tools.ietf.org/html/rfc4180" target="_blank">RFC-4180</a>.
						</li>
						<li>
							The first line is often the header, or column names. Each subsequent row is a record and should have the same number of fields.
						</li>
						<li>
							Fields containing the separator character, line breaks and double-quotes must be enclosed inside double quotes <code>"</code>.
						</li>
						<li>
							Other separator are often used like tabs <code>\t</code>or semi-colons <code>;</code>.
							TSV or Tab Separated Values is used to store table data in Clipboards.
							When data is copied from Excel for example, it is stored as TSV in the Clipboard.
						</li>
						<li>
							With CSVJSON you can parse values as numbers or JSON. Turn on respective <strong>Parse Numbers</strong> and <strong>Parse JSON</strong> switches to convert valid numbers and JSON (null, false, true, [] and {}).
						</li>
						<li>
							With CSVJSON you can transpose the csv before conversion. Rows become columns, and columns become rows.
						</li>
						<li>
							With CSVJSON you can output a hash (or object) instead of an array. In that case, the hash key will be the first column.
						</li>
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
								<h5>Mar 20, 2019</h5><p> Bug fix: Detect duplicate column headers and make them unique. <a href="https://github.com/FlatFilers/csvjson-app/issues/71">GitHub issue #71</a>.</p>
								<h5>Feb 2, 2019</h5><p> Refactored and published <a href="https://www.npmjs.com/package/csvjson-csv2json" target="_blank">npm package csv2json</a>. Fix for <a href="https://github.com/FlatFilers/csvjson-app/issues/70">GitHub issue #70</a>.</p>
								<h5>Jan 26, 2019</h5><p> Improvement: Removed 64k limit on download button. Also fixed issue #68 'Cannot work functional with special letters'.</p>
								<h5>Mar 31, 2018</h5><p> Improvement: Added option to parse JSON values.</p>
								<h5>Dec 18, 2017</h5><p> Improvement: Added option to minify or compact JSON. <a href="https://github.com/FlatFilers/csvjson-app/issues/21">GitHub issue #21</a></p>
								<h5>Oct 7, 2016</h5><p> Improvement: Added option to parse number values or not to retain original number formatting. <a href="https://github.com/FlatFilers/csvjson-app/issues/13">GitHub issue #13</a></p>
								<h5>Jul 09, 2016</h5><p> Fixed bug : If no text is present in a csv field, it was assigned 0 (zero) by default.</p>
								<h5>Jun 20, 2016</h5><p> Bug fix: strings containing quotes and commas were prematurely cut.</p>
								<h5>Dec 30, 2015</h5><p> Bug fix: drop quotes on keys of nested objects.</p>
								<h5>Nov 26, 2015</h5><p> Improvement: Added options to transpose and output object instead of array.</p>
								<h5>Jan 30, 2014</h5><p> Bug fix: Pasting Excel data into Textarea would cause an upload.</p>
								<h5>Jan 12, 2014</h5><p> Initial release.</p>
						</div>

			      </div>
			    </div>

  </div>

</div>
