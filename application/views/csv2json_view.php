<div class="container-fluid">
	<div class="row">
		<div class="description col-md-12">
			<p>Convert your CSV or TSV formatted data to JSON. Optionally transpose your data, or output an object instead of an array. Copy/paste or upload your Excel data to convert it to JSON.</p>
		</div>
	</div>
	
	<div class="row">
		<div class="col-md-5 more-bottom-margin">
			<div class="form-group">
				<label>Upload a CSV file</label>
				<span class="btn btn-default fileinput-button form-control">
					<label>
						<i class="glyphicon glyphicon-plus"></i>
						<span>Select a file...</span>
					</label>
					<input id="fileupload" type="file" name="file" />
				</span>
			</div>
			<div class="form-group code-group">
				<label>Or paste your CSV here</label>
<textarea id="csv" class="form-control input save" rows="15">
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
							<option value="auto" selected="selected">Auto-detect</option>
							<option value="comma">Comma</option>
							<option value="semiColon">Semi-colon</option>
							<option value="tab">Tab</option>
						</select>
					</label>
					&nbsp;
					<label class="inline" title="Check to parse numbers (i.e. '7e2' would become 700). Uncheck to keep original formatted numbers as strings.">
						<input type="checkbox" id="parseNumbers" name="parseNumbers" class="save" checked="checked "/> Parse numbers
					</label>
					&nbsp;
					<label class="inline" title="Transpose the data beforehand.">
						<input type="checkbox" id="transpose" name="transpose" class="save" /> Transpose
					</label>
					&nbsp;
					<label class="inline">Output:</label>
					<label class="radio-inline" title="Output an array of objects."><input type="radio" id="output-array" name="output" class="save" value="array" checked="checked" />Array</label>
					<label class="radio-inline"  title="Output an object instead of an array. First column is used as hash key."><input type="radio" id="output-hash" name="output" class="save" value="hash" />Hash</label>
				</div>
			</div>
			<div class="form-group code-group">
				<label>JSON</label>
				<textarea id="json" class="form-control result save" rows="15"></textarea>
			</div>
			<p class="help-block">Ctrl + A then Ctrl + C to copy to clipboard.</p>
			<a class="convert" href="#" title="Convert"><i class="glyphicon glyphicon-chevron-right"></i></a>
			<a class="clear" href="#" title="Clear"><i class="glyphicon glyphicon-remove"></i></a>
		</div>
	</div>
	<div class="row">
		<div class="col-md-8">
			<h4>About CSV</h4>
			<ul>
				<li>
					CSV stands for <a href="http://en.wikipedia.org/wiki/Comma-separated_values" target="_blank">Comma Separated Values</a>.
					Often used as an interchange data format to represent table records, one per line. CSV is plain text.
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
					You can transpose the csv before conversion. Rows become columns, and columns become rows.
				</li>
				<li>
					You can also output a hash (or object) instead of an array. In that case, the hash key will be the first column.
				</li>
			</ul>
			<h4>Change Log</h4>
			<ul>
				<li><strong>Oct 7, 2016</strong> Improvement: Added option to parse number values or not to retain original number formatting. <a href="https://github.com/martindrapeau/csvjson-app/issues/13">GitHub issue #13</a></li>
				<li><strong>Jul 09, 2016</strong> Fixed bug : If no text is present in a csv field, it was assigned 0 (zero) by default.</li>
				<li><strong>Jun 20, 2016</strong> Bug fix: strings containing quotes and commas were prematurely cut.</li>
				<li><strong>Dec 30, 2015</strong> Bug fix: drop quotes on keys of nested objects.</li>
				<li><strong>Nov 26, 2015</strong> Improvement: Added options to transpose and output object instead of array.</li>
				<li><strong>Jan 30, 2014</strong> Bug fix: Pasting Excel data into Textarea would cause an upload.</li>
				<li><strong>Jan 12, 2014</strong> Initial release.</li>
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
