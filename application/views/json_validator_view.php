<div class="container px-4 py-5">
  <div class="row">
    <div class="description col-md-12">
      <h1 class="text-primary fw-bold">JSON Validator</h1>
      <p>To get started, upload or paste your JSON.
    </div>
  </div>


  <div class="row gx-5">
    <div class="col-md-5 mb-5">
      <div class="mb-5">
        <label class="form-label">Upload a file</label>
          <input id="fileupload" type="file" name="file" class="form-control"/>
      </div>

      <div class="mb-3">
        <label class="form-label">Or paste your JSON here</label>
<textarea id="result" class="form-control result save" rows="14" placeholder="Paste your JSON here" spellcheck="false">{}</textarea>
      </div>


      <div class="clearfix more-bottom-margin">
        <button id="clear" type="submit" class="btn btn-light mb-2 me-2">
          <i class="bi bi-backspace"></i> Clear
        </button>
      </div>

    </div>
    <div class="col-md-7">
      <div class="form-group">
        <label class="form-label">Result</label>
        <div id="status" class="alert alert-default m-t-2"></div>
      </div>
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
            JSON Validator verifies that your <strong>JavaScript Object Notation</strong> adheres to the JSON specification: <a href="http://www.json.org" target="_blank">www.json.org</a>.
          </li>
          <li>
            JSON Validator also formats or humanizes your JSON to render it readable following common linting practices such as multi-line and indentation.
          </li>
          <li>
            Looking for more options to format your JSON? Checkout CSVJSON's <a href="/json_beautifier">JSON Beautifier</a>. It has tons of options to make your JSON pretty.
          </li>
          <li>
            Did you know that all browsers have a built-in JSON linter via the global object <code>JSON</code>? Method <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify" target="_blank"><code>JSON.stringify</code></a> implements the validation and formatting of JSON.
          </li>
        </ul>
        <br/>
        <h4>What is Linting?</h4>
        <ul>
          <li>A JSON linter is the combination of validating and formatting JSON performed together.</li>
          <li>
            The term "lint" originates from the <a href="http://www-it.desy.de/cgi-bin/man-cgi?lint+1" target="_blank">UNIX command <code>lint</code></a> <a href="http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.56.1841" target="_blank">"which examines C source programs, detecting a number of bugs and obscurities"</a>. A "linter" is the program which performs "linting" on source code.
          </li>
          <li>
            JSON is a data format and not a programming language. As such, linting JSON is more about validating and then formatting for humans to read more efficiently (splitting on multiple lines and indenting nested values and objects). Nevertheless, the term "lint" is now commonly accepted to encompass both validation and formatting.
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
								  <h5>Sep 12, 2018</h5> <p>Newly added.</p>
						</div>

			      </div>
		</div>

  </div>

</div>
