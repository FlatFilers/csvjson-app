<div class="container-fluid">
	<div class="row">
		<div class="description col-md-12">
			<h1 class="discrete">Online tool to validate, format and beautify your JSON.</h1>
			<p>1) Copy/paste or upload your JSON. 2) Set up options: Indent your JSON as you wish. Remove double quotes around numbers. Remove double quotes on keys. Collapse short arrays. 3) Validate and format your JSON. 4) Save your result for later or for sharing.</p>
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
				<textarea id="json" class="form-control input save" rows="18" spellcheck="false"><?=$default?></textarea>
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
					<label class="inline" title="JSON wraps keys with double quotes by default. JavaScript doesn't need them though. Check this box to drop them. Will make for invalid JSON but valid JavaScript.">
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
					<label class="inline" title="Quote type around values">
						Quotes
						<select id="quote-type" name="quote-type" class="save">
							<option value="single">Single</option>
							<option value="double" selected="selected">Double</option>
						</select>
					</label>
					&nbsp;
					<label class="inline" title="Collpase arrays inline if less than the width in characters of the textarea. You can limit the nesting depth where it applies.">
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
					&nbsp;
					<label class="inline" title="Minify or compact result by removing spaces and new lines. Warning: this overrides other options.">
						<input type="checkbox" id="minify" name="minify" class="save" /> Minify
					</label>
				</div>
			</div>
			<?php $this->load->view('result_textarea_buttons_view', array('result_title' => 'Result', 'download' => 'csvjson.json')); ?>
		</div>
		
	</div>
	<br/>
	<div class="row">
		<div class="col-md-8 about">
			<h4>Node.js</h4>
			<p>This function is available as a <a href="https://www.npmjs.com/package/csvjson-json_beautifier" target="_blank">npm package</a>.</p>
			<h4>About JSON</h4>
			<ul>
				<li>JSON stands for <strong>JavaScript Object Notation</strong>. It is a lightweight data-interchange format and fully described on <a href="http://www.json.org" target="_blank">www.json.org</a>.</li>
				<li>
					JSON is based on JavaScript but the format is stricter. JSON requires double quotes around keys whereas JavaScript does not. For example, this is valid JavaScript:<br/>
					<pre>{pi: 3.14159265359, e: 2.7182818284, prime: [2, 3, 5, 7, 11, 13, 17, 19]}</pre>
					However the above is not valid JSON. Double quotes must be placed around pi, e and prime.
					<pre>{"pi": 3.14159265359, "e": 2.7182818284, "prime": [2, 3, 5, 7, 11, 13, 17, 19]}</pre>
					CSVJSON's JSON Beautifier has a toggle to drop quotes on keys. It can do so if JavaScript allows it. For example, we cannot drop quotes around key <code>"1+6"</code>.
					CSVJSON also has a toggle to use single quotes to wrap keys and values.
				</li>
				<li>Modern browsers have a built-in global object <code>JSON</code> with encoding and decoding functions. These are:
					<ul>
						<li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify" target="_blank">JSON.stringify</a> to encode a JavaScript object into a JSON string; and</li>
						<li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse" target="_blank">JSON.parse</a> to parse a JSON string and convert it to a JavaScript object.</li>
					</ul>
					To support older browsers, use <a href="https://github.com/douglascrockford/JSON-js" target="_blank">JSON2</a> written by Douglas Crockford as polyfill.
				</li>
				<li>CSVJON uses a <a href="https://github.com/FlatFilers/csvjson-app/blob/master/js/csvjson/json2-mod.js" target="_blank">modified version of JSON2</a> which adds formatting options to drop quotes on keys, and sepcify the quote type. Anyone is free to use and extend it by forking the <a href="https://github.com/FlatFilers/csvjson-app" target="_blank">CSVJSON GitHub repo</a>.</li>
			</ul>
			<br/>
			<h4>Change Log</h4>
			<ul>
				<li><strong>Jun 25, 2019</strong> Adjustable width for inling short arrays. Fix for <a href="https://github.com/FlatFilers/csvjson-app/issues/76">issue #76</a>.</li>
				<li><strong>Feb 3, 2019</strong> Refactored and published <a href="https://www.npmjs.com/package/csvjson-json_beautifier" target="_blank">npm package json_beautifier</a>.</li>
				<li><strong>Jan 26, 2019</strong> Improvement: Removed 64k limit on download button.</li>
				<li><strong>Dec 18, 2017</strong> Improvement: Added option to minify or compact JSON. <a href="https://github.com/FlatFilers/csvjson-app/issues/21">GitHub issue #21</a></li>
				<li><strong>Oct 7, 2017</strong> Improvement: <a href="https://github.com/hisabimbola" target="_blank">Abimbola Idowu</a> added single quote option. <a href="https://github.com/FlatFilers/csvjson-app/issues/23" target="_blank">GitHub issue #23</a></li>
				<li><strong>Sep 27, 2016</strong> Bug fix: Inline short arrays bug fix and improvement. Added nesting depth option. <a href="https://github.com/FlatFilers/csvjson-app/issues/12" target="_blank">GitHub issue #12</a></li>
				<li><strong>Aug 22, 2016</strong> Bug fix: Inline short arrays was not working properly. <a href="https://github.com/FlatFilers/csvjson-app/issues/9" target="_blank">GitHub issue #9</a></li>
				<li><strong>Dec 30, 2015</strong> Bug fix: drop quotes on keys of nested objects.</li>
				<li><strong>Jun 1, 2015</strong> Bug fix: proper support of commas inside quotes.</li>
				<li><strong>Jan 12, 2014</strong> Initial release.</li>
			</ul>
			<br/>
			<?php $this->load->view('feedback'); ?>
		</div>
		<div class="col-md-4">
			<?php //$this->load->view('carbonads'); ?>
		</div>
	</div>
</div>
