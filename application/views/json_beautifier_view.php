<div class="container">
	<div class="row">
		<div class="description col-md-12">
			<p>Beautify your JSON. Validate and format it. Indent as you wish. Remove double quotes around numbers. Remove double quotes on keys. Collapse short arrays.</p>
		</div>
	</div>
	
	<div class="row">
		<div class="col-md-5 more-bottom-margin">
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
			<div class="form-group code-group">
				<label>Or paste your JSON here</label>
				<?php $default = '{"pi": "3.14159265359", "e": "2.7182818284", "prime": [2, 3, 5, 7, 11, 13, 17, 19], "1+6": 7}'; ?>
				<textarea id="json" class="form-control input save" rows="20"><?=$default?></textarea>
			</div>
			<button id="convert" type="submit" class="btn btn-primary action">
				<i class="glyphicon glyphicon-chevron-right"></i> Beautify
			</button>
			<button id="clear" type="submit" class="btn">
				<i class="glyphicon glyphicon-remove"></i> Clear
			</button>
		</div>
		
		<div class="col-md-7 more-bottom-margin">
			<div class="form-group">
				<label>Options <small>Hover on option for help</small></label>
				<div class="form-control">
					<label class="inline">No quotes:</label>
					<label class="inline" title="JSON wraps keys with double quotes by default. Javascript doesn't need them though. Check this box to drop them. Will make for invalid JSON but valid Javascript.">
						<input type="checkbox" id="drop-quotes-on-keys" name="drop-quotes-on-keys" class="save" /> on keys
					</label>
					<label class="inline" title="Check this box to parse number values and drop quotes around them.">
						<input type="checkbox" id="drop-quotes-on-numbers" name="drop-quotes-on-numbers" class="save" /> on numbers
					</label>
					&nbsp;
					<label class="inline" title="Indentation preference.">
						Indent
						<select id="space" name="space" class="save">
							<option value="tab">tab</option>
							<option value="1">1 space</option>
							<option value="2" selected="selected">2 spaces</option>
							<option value="3">3 spaces</option>
							<option value="4">4 spaces</option>
							<option value=".">.</option>
							<option value="..">..</option>
						</select>
					</label>
					&nbsp;
					<label class="inline" title="Collpase arrays inline if less than 80 characters. You can limit the nesting depth where it applies.">
						<input type="checkbox" id="inline-short-arrays" name="inline-short-arrays" class="save" />
						Inline short arrays
						<select id="inline-short-arrays-depth" name="inline-short-arrays-depth" class="save">
							<option value="1" selected="selected">1</option>
							<option value="2">2</option>
							<option value="3">3</option>
							<option value="4">4</option>
							<option value="5">5</option>
						</select>
						level deep
					</label>
				</div>
			</div>
			<div class="form-group code-group">
				<label>Result</label> <span class="result-note"></span>
				<textarea id="result" class="form-control result save" rows="20"></textarea>
			</div>
			<p class="help-block">Ctrl + A then Ctrl + C to copy to clipboard.</p>
			<a class="convert" href="#" title="Convert"><i class="glyphicon glyphicon-chevron-right"></i></a>
			<a class="clear" href="#" title="Clear"><i class="glyphicon glyphicon-remove"></i></a>
		</div>
		
	</div>
	<br/>
	<div class="row">
		<div class="col-md-8 about">
			<h4>About JSON</h4>
			<ul>
				<li>JSON stands for <strong>JavaScript Object Notation</strong>. It is a lightweight data-interchange format and fully described on <a href="http://www.json.org" target="_blank">www.json.org</a>.</li>
				<li>
					JSON is based on Javascript but the format is stricter. JSON requires double quotes around keys whereas Javascript does not. For example, this is valid Javascript:<br/>
					<pre>{pi: 3.14159265359, e: 2.7182818284, prime: [2, 3, 5, 7, 11, 13, 17, 19]}</pre>
					However the above is not valid JSON. Double quotes must be placed around pi, e and prime.
					<pre>{"pi": 3.14159265359, "e": 2.7182818284, "prime": [2, 3, 5, 7, 11, 13, 17, 19]}</pre>
					<em>JSON Beautifier has a toggle to drop quotes on keys. It can do so if Javascript allows it. For example, we cannot drop quotes around key <code>"1+6"</code>.</em>
				</li>
				<li>Modern browsers have a built-in global object <code>JSON</code> with encoding and decoding functions. These are:
					<ul>
						<li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify" target="_blank">JSON.stringify</a> to encode a Javascript object into a JSON string; and</li>
						<li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse" target="_blank">JSON.parse</a> to parse a JSON string and convert it to a Javascript object.</li>
					</ul>
					To support older browsers, use <a href="https://github.com/douglascrockford/JSON-js" target="_blank">JSON2</a> written by Douglas Crockford as polyfill.
				</li>
			</ul>
			<h4>Change Log</h4>
			<ul>
				<li><strong>Sep 27, 2016</strong> Bug fix: Inline short arrays bug fix and improvement. Added nesting depth option. <a href="https://github.com/martindrapeau/csvjson-app/issues/12">GitHub issue #12</a></li>
				<li><strong>Aug 22, 2016</strong> Bug fix: Inline short arrays was not working properly. <a href="https://github.com/martindrapeau/csvjson-app/issues/9">GitHub issue #9</a></li>
				<li><strong>Dec 30, 2015</strong> Bug fix: drop quotes on keys of nested objects.</li>
				<li><strong>Jun 1, 2015</strong> Bug fix: proper support of commas inside quotes.</li>
				<li><strong>Jan 12, 2014</strong> Initial release.</li>
			</ul>
			<?php $this->load->view('feedback'); ?>
		</div>
		<div class="col-md-4">
			<?php $this->load->view(rand(1,2) == 1 ? "ludo" : "miamboom"); ?>
		</div>
	</div>
</div>
