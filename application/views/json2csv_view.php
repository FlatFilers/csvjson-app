<div class="container-fluid">
	<div class="row">
		<div class="description col-md-12">
			<p>Convert your JSON to CSV or TSV formatted data. Copy/paste or upload your JSON to convert it to CSV.</p>
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
				<?php $default = '{"pi": "3.14159265359", "e": "2.7182818284", "prime": [2, 3, 5, 7, 11, 13, 17, 19], "1+6": 7}'; ?>
				<textarea id="json" class="form-control input save" rows="20"><?=$default?></textarea>
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
							<option value="comma" selected="selected">Comma</option>
							<option value="tab">Tab</option>
							<option value="semiColon">Semi-colon</option>
						</select>
					</label>
				</div>
			</div>
			<div class="form-group code-group">
				<label>CSV or TSV</label>
				<textarea id="csv" class="form-control result save" rows="20"></textarea>
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
				<li><strong>Oct 8, 2016</strong> Initial release.</li>
			</ul>
			<?php $this->load->view('feedback'); ?>
		</div>
		<div class="col-md-4">
			<?php
				$this->load->view('adsense');
				$this->load->view(rand(1,2) == 1 ? "ludo" : "miamboom");
			?>
		</div>
	</div>
</div>
