<div class="container">
	<div class="row">
		<div class="description col-md-12">
			<p>Convert your CSV or TSV formatted data to JSON. Copy/paste or upload your Excel data to convert it to JSON.</p>
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
				<label>Field separator</label>
				<div class="form-control options">
					<label class="radio-inline"><input type="radio" id="auto-detect" name="separator" class="save" value="auto" checked="checked" />Auto-detect</label>
					<label class="radio-inline"><input type="radio" id="comma" name="separator" class="save" value="comma" />Comma</label>
					<label class="radio-inline"><input type="radio" id="semi-colon" name="separator" class="save" value="semiColon" />Semi-colon</label>
					<label class="radio-inline"><input type="radio" id="tab" name="separator" class="save" value="tab" />Tab</label>
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
		<div class="col-md-12">
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
			</ul>
		</div>
	</div>
</div>