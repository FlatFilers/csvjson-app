<div class="container px-4 py-5">
	<div class="row">
		<div class="description col-md-12">
			<h1 class="text-primary fw-bold">Beautify your JSON.</h1>
			<p>To get started, upload or paste your JSON.
		</div>
	</div>
	<div class="row gx-5">
		<div class="col-md-5 more-bottom-margin">
			<div class="mb-5">
				<label class="form-label">Upload a file</label>
				<input id="fileupload" type="file" name="file" class="form-control"/>
			</div>
			<div class="form-group code-group">
				<label class="form-label">Or paste your JSON here</label>
				<?php $default = '{"pi": "3.14159265359", "e": "2.7182818284", "prime": [2, 3, 5, 7, 11, 13, 17, 19], "1+6": 7}'; ?>
				<div class="mb-3">
					<textarea id="json" class="form-control input save" rows="18" spellcheck="false"><?=$default?></textarea>
				</div>
			</div>
			<button id="convert" type="submit" class="btn btn-primary action mb-2 me-2">
				<i class="bi bi-chevron-right"></i> Beautify
			</button>
			<button id="clear" type="submit" class="btn btn-light mb-2 me-2">
				<i class="bi bi-backspace"></i> Clear
			</button>
		</div>

		<div class="col-md-7">
			<div class="mb-3">
				<div class="form-check-inline">
					<label class="form-label" title="Indentation preference.">
						<div class="mb-2">Indent</div>
						<select id="space" name="space" class="form-select save">
							<option value="tab">tab</option>
							<option value="1">1 space</option>
							<option value="2" selected="selected">2 spaces</option>
							<option value="3">3 spaces</option>
							<option value="4">4 spaces</option>
							<option value=".">.</option>
							<option value="..">..</option>
						</select>
					</label>
				</div>
				<div class="form-check-inline">
					<label class="form-label" title="Quote type around values">
						<div class="mb-2">Quotes</div>
						<select id="quote-type" name="quote-type" class="form-select save">
							<option value="single">Single</option>
							<option value="double" selected="selected">Double</option>
						</select>
					</label>
				</div>
				<div class="form-check-inline">
					<label class="form-label" title="Collpase arrays inline if less than the width in characters of the textarea. You can limit the nesting depth where it applies.">
						<div class="">
							<div class="form-check-inline">
								<input type="checkbox" id="inline-short-arrays" name="inline-short-arrays" class="form-check-input save" />
								<label class="form-label">Inline short arrays</label>
						</div>
						</div>
						<select id="inline-short-arrays-depth" name="inline-short-arrays-depth" class="form-select save">
							<option value="1" selected="selected">1 level deep</option>
							<option value="2">2 levels deep</option>
							<option value="3">3 levels deep</option>
							<option value="4">4 levels deep</option>
							<option value="5">5 levels deep</option>
						</select>

					</label>
				</div>
				<br/>
				<div class="form-check-inline">
					<label class="form-check-label me-2">No quotes:</label>
					<input type="checkbox" id="drop-quotes-on-keys" name="drop-quotes-on-keys" class="form-check-input save" />
					<label class="form-check-label" title="JSON wraps keys with double quotes by default. JavaScript doesn't need them though. Check this box to drop them. Will make for invalid JSON but valid JavaScript.">
						 on keys
					</label>
				</div>
				<div class="form-check-inline">
					<input type="checkbox" id="drop-quotes-on-numbers" name="drop-quotes-on-numbers" class="form-check-input save" />
					<label class="form-check-label" title="Check this box to parse number values and drop quotes around them.">
						 on numbers
					</label>
				</div>
				<div class="form-check-inline">
					<input type="checkbox" id="minify" name="minify" class="form-check-input save" />
					<label class="form-check-label" title="Minify or compact result by removing spaces and new lines. Warning: this overrides other options.">
						 Minify
					</label>
				</div>
			</div>
			<?php $this->load->view('result_textarea_buttons_view', array('result_title' => 'Result', 'download' => 'csvjson.json')); ?>
		</div>

	</div>
</div>




<div class="container px-4 py-5" id="about-flatfile">

	<h2 class="pb-2 border-bottom">Need help cleaning data?</h2>

	<div class="row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4 py-3">
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

  <div class="row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4 py-3">
    <div class="col d-flex align-items-start">
      <div>

				<ul>
					<li>
						This function is available as a <a href="https://www.npmjs.com/package/csvjson-json_beautifier" target="_blank">npm package</a>.
					</li>
					<li>JSON stands for <strong>JavaScript Object Notation</strong>. It is a lightweight data-interchange format and fully described on <a href="http://www.json.org" target="_blank">www.json.org</a>.</li>
					<li>
						JSON is based on JavaScript but the format is stricter. JSON requires double quotes around keys whereas JavaScript does not.
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

						<h5>Jun 25, 2019</h5><p> Adjustable width for inling short arrays. Fix for <a href="https://github.com/FlatFilers/csvjson-app/issues/76">issue #76</a>.</p>
						<h5>Feb 3, 2019</h5> <p>Refactored and published <a href="https://www.npmjs.com/package/csvjson-json_beautifier" target="_blank">npm package json_beautifier</a>.</p>
						<h5>Jan 26, 2019</h5><p> Improvement: Removed 64k limit on download button.</p>
						<h5>Dec 18, 2017</h5><p> Improvement: Added option to minify or compact JSON. <a href="https://github.com/FlatFilers/csvjson-app/issues/21">GitHub issue #21</a></p>
						<h5>Oct 7, 2017</h5> <p>Improvement: <a href="https://github.com/hisabimbola" target="_blank">Abimbola Idowu</a> added single quote option. <a href="https://github.com/FlatFilers/csvjson-app/issues/23" target="_blank">GitHub issue #23</a></p>
						<h5>Sep 27, 2016</h5><p> Bug fix: Inline short arrays bug fix and improvement. Added nesting depth option. <a href="https://github.com/FlatFilers/csvjson-app/issues/12" target="_blank">GitHub issue #12</a></p>
						<h5>Aug 22, 2016</h5><p> Bug fix: Inline short arrays was not working properly. <a href="https://github.com/FlatFilers/csvjson-app/issues/9" target="_blank">GitHub issue #9</a></p>
						<h5>Dec 30, 2015</h5><p> Bug fix: drop quotes on keys of nested objects.</p>
						<h5>Jun 1, 2015</h5><p> Bug fix: proper support of commas inside quotes.</p>
						<h5>Jan 12, 2014</h5><p> Initial release.</p>
					</div>
	    	</div>
			 </div>

  </div>

</div>
