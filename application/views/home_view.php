<div class="bg-dark text-secondary px-4 py-5 text-center">
	<div class="pt-5">
		<h1 class="display-2 fw-bold text-warning">Your data, converted.</h1>
		<h4 class="fw-bold text-white pb-2">Easy, confidential online data converter.</h4>
		<div class="col-lg-6 mx-auto">
			<p class="fs-5 mb-4">
				We're Flatfile, the company behind <b>csvjson</b>.com. We offer this tool to the community for <b>free</b>, but our day job is fixing data import once and for all for people like you.
			</p>
		</div>
		<div class="col-lg-12 mx-auto pt-4">
			<div class="text-white">Choose from popular data formats to convert your data now:</div>
			<div class="d-grid gap-2 d-sm-flex justify-content-sm-center py-4">
				<a class="btn btn-primary btn-lg px-4 me-sm-3 fw-bold" href="/csv2json" title="Convert a CSV to JSON format.">CSV to JSON</a>
				<a class="btn btn-primary btn-lg px-4 me-sm-3 fw-bold" href="/json2csv" title="Convert JSON format to a CSV.">JSON to CSV</a>
				<a href="/sql2json" class="btn btn-primary btn-lg px-4 me-sm-3 fw-bold" title="Convert an SQL export to JSON format.">SQL to JSON</a>
				<a href="/csvjson2json" class="btn btn-primary btn-lg px-4 me-sm-3 fw-bold" title="Conversion of the CSVJSON format variant to JSON.">CSVJSON to JSON</a>
			</div>
		</div>
		<div class="col-lg-12 mx-auto pt-5">
			<div class="text-secondary">Additional tools to validate, clean and transform your data:</div>
			<div class="d-grid gap-2 d-sm-flex justify-content-sm-center py-4">
				<a class="btn btn-outline-primary btn-sm px-4 me-sm-3" href="/json_validator" title="Validate and format your JSON.">JSON Validator</a>
				<a class="btn btn-outline-primary btn-sm px-4 me-sm-3" href="/json_beautifier" title="Validate, format and beautify your JSON.">JSON Beautifier</a>
				<!--<a href="/datajanitor" class="btn btn-outline-primary btn-sm px-4 me-sm-3" title="Excel and Google Sheets data cleaning and transformation.">Data Janitor <small>BETA</small></a>-->
			</div>
		</div>
	</div>
</div>

<div class="container px-4 py-5" id="about-data-formats">

  <h2 class="pb-2 border-bottom">About Data Formats</h2>

  <div class="row row-cols-1 row-cols-sm-1 row-cols-md-3 row-cols-lg-3 g-4 py-5">
    <div class="col d-flex align-items-start">
      <div>
        <h5 class="fw-bold mb-0">CSV</h5>
        <p>
					CSV or Comma Separated Values is widely used for tabular data and often associated to spreadsheet applications like Excel.
					<br/><br/>
					Many data reporting tools output to CSV format.
				</p>
      </div>
    </div>
    <div class="col d-flex align-items-start">
      <div>
        <h5 class="fw-bold mb-0">JSON</h5>
        <p>
					JSON stands for JavaScript Object Notation and has become the defacto computer format readable by humans to store structured data.
					<br/><br/>
					From APIs to configuration files, JSON is now everywhere.
				</p>
      </div>
    </div>
		<div class="col d-flex align-items-start">
      <div>
        <h5 class="fw-bold mb-0">SQL</h5>
        <p>
					SQL stands for Structured Query Language and is the standard language for relational database management systems.
					<br/><br/>
					SQL is one of the most-used languages in the tech industry.
				</p>
      </div>
    </div>
  </div>

</div>

<div class="container px-4 py-5" id="about-csvjson">

  <h2 class="pb-2 border-bottom">About csv<b>json</b></h2>

  <div class="row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4 py-5">
    <div class="col d-flex align-items-start">
      <div>
        <p>
					As a developer, format conversion is something we sometimes have to do. We often look online for solutions and tools finding they only cover partly our needs.
					<a href="https://flatfile.com/get-started?utm_source=csvjson&utm_medium=csvjson_body&utm_campaign=q1-2022-csvjson-redesign">Flatfile<a/> is proud to offer csv<b>json</b>, a do-it-yourself csv converter to the community for free.
					Its best feature? You can save your session for later, and share it with a co-worker.

				</p>
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
							<h5>2022-1-21</h5>
							<p>
								Upgraded to <a href="https://getbootstrap.com/docs/5.0/getting-started/introduction/" target="_blank">Bootstrap 5</a>.
							</p>
							<h5>2019-10-01</h5>
							<p>
								Integrated design for sponsorship by <a href="https://flatfile.com/get-started?utm_source=csvjson-home&utm_medium=csvjsov_body&utm_campaign=q1-2022-csvjson-redesign">Flatfile</a>.
							</p>
							<h5>2019-07-15</h5>
							<p>
								JSON 2 CSV bug fix. BOM was missing causing the lost of accented characters in Excel.
								Fix for <a href="https://github.com/FlatFilers/csvjson-app/issues/78">GitHub issue #78</a>.
								Thanks to <a href="https://github.com/elbaza1">EL BAZA</a> for reporting.
							</p>
							<h5>2019-06-25</h5>
							<p>
								JSON Beautifier improvement. Variable width when inlining short arrays. For fix <a href="https://github.com/FlatFilers/csvjson-app/issues/76">GitHub issue #76</a>.
								Thanks to <a href="https://github.com/galileo-pkm">galileo-pkm</a> for reporting.
							</p>
							<h5>2019-06-06</h5>
							<p>
								Fixed bug where uploading a file went to the result box instead of the json box.
								<a href="https://github.com/FlatFilers/csvjson-app/issues/75">GitHub issue #75</a>.
								Thanks to <a href="https://github.com/ejaustin">Emily</a> for reporting.
							</p>
							<h5>2019-03-20</h5>
							<p>
								<a href="/csv2json">CSV to JSON</a> bug fix: Detect duplicate column headers and make them unique. <a href="https://github.com/FlatFilers/csvjson-app/issues/71">GitHub issue #71</a>. Thanks to <a href="https://github.com/SummerSun">Summer</a> for reporting.
							</p>
							<h5>2019-02-03</h5>
							<p>
								Function <code>json2csv</code> now available as a <a href="https://www.npmjs.com/package/csvjson-json2csv" target="_blank">npm package</a>.
								Function <code>json_beautifier</code> now available as a <a href="https://www.npmjs.com/package/csvjson-json_beautifier" target="_blank">npm package</a>.
							</p>
							<h5>2019-02-02</h5>
							<p>
								Function <code>csv2json</code> now available as a <a href="https://www.npmjs.com/package/csvjson-csv2json" target="_blank">npm package</a>.
							</p>
							<h5>2019-01-26</h5>
							<p>
								Improvement: Removed 64k limit on download button.
							</p>
							<h5>2018-12-26</h5>
							<p>
								Confidentiality statement and improvements on Data Janitor.
							</p>
							<h5>2018-12-01</h5>
							<p>
								Added a new tool <a href="/datajanitor">Data Janitor</a> to perform Excel and Google Sheets data cleaning and transformation.
							</p>
							<h5>2018-11-18</h5>
							<p>
								Added a copy-to-clipboard button and upgraded underscore and backbone to latest versions.
							</p>
							<h5>2018-09-13</h5>
							<p>
								Added a new tool <a href="/json_validator">JSON Validator</a> to validate and format JSON. Integrates a beautiful code editor (CodeMirror) with interactive JSON linting.
							</p>
							<h5>2018-04-03</h5>
							<p>
								Added a new tool <a href="/csvjson2json">CSVJSON to JSON</a> to support conversion of the new <a href="http://csvjson.org/" target="_blank">CSVJSON format</a>, a CSV variant proposed by Dror Harari.
							</p>
							<h5>2018-03-31</h5>
							<p>
								Improvements to CSV converters to support CSVJSON format variant (<a href="http://csvjson.org/" target="_blank">csvjson.org</a>).
							</p>
							<h5>2018-01-24</h5>
							<p>Added a new converter: <a href="/json2csv">JSON to CSV</a>.</p>
							<p>New button to report a bug or ask for improvements.</p>
							<h5>2018-01-08</h5>
							<p>
								Support escaped quotes in <a href="/sql2json">SQL to JSON</a>: <a href="https://github.com/FlatFilers/csvjson-app/issues/26">GitHub issue #26</a>. Thank you <a href="https://github.com/lbottoni" target="_blank">lbottoni</a> for reporting.
							</p>
							<h5>2017-12-18</h5>
							<p>SQL to JSON parsing bug fix. Convert <code>NULL</code> to <code>null</code>.</p>
							<p>
								Added a minify option to compact JSON by removing spaces and new lines. Fix for <a href="https://github.com/FlatFilers/csvjson-app/issues/21" target="_blank">GitHub Issue #21</a>. Thank you <a href="https://github.com/myatmins" target="_blank">Myat Min Soe</a> for requesting this feature.
							</p>
							<h5>2017-12-13</h5>
							<p>
								SQL to JSON parsing bug fix. Do not split when detecting a comma in a string value: <a href="https://github.com/FlatFilers/csvjson-app/issues/25" target="_blank">GitHub Issue #25</a>.
							</p>
							<h5>2017-10-07</h5>
							<p>
								<a href="https://github.com/hisabimbola" target="_blank">Abimbola Idowu</a> added single quote option. <a href="https://github.com/FlatFilers/csvjson-app/issues/23" target="_blank">GitHub issue #23</a>
							</p>
							<h5>2017-09-04</h5>
							<p>
								SQL to JSON parsing bug fix: <a href="https://github.com/FlatFilers/csvjson-app/issues/22" target="_blank">GitHub Issue #22</a>.
							</p>
							<h5>2016-09-27</h5>
							<p>
								CSV to JSON improvement: <a href="https://github.com/FlatFilers/csvjson-app/issues/13" target="_blank">GitHub Issue #13</a> - Added option to parse number values or not to retain original number formatting.
							</p>
							<h5>2016-09-27</h5>
							<p>
								JSON Beautifier bug fix and improvement: <a href="https://github.com/FlatFilers/csvjson-app/issues/12" target="_blank">GitHub Issue #12</a> - Inline short arrays bug fix and improvement. Added nesting depth option.
							</p>
							<h5>2016-08-29</h5>
							<p>
								SQL to JSON bug fix: <a href="https://github.com/FlatFilers/csvjson-app/issues/11" target="_blank">GitHub Issue #11</a> - support multile values in single-line INSERT INTO statement.
							</p>
							<h5>2016-08-22</h5>
							<p>
								JSON Beautifier bug fix: Inline short arrays was not working properly. <a href="https://github.com/FlatFilers/csvjson-app/issues/9">GitHub issue #9</a>
							</p>
							<h5>2016-07-09</h5>
							<p>
								CSV to JSON bug fix: If no text is present in a csv field, it was assigned 0 (zero) by default.
							</p>
							<h5>2016-06-20</h5>
							<p>
								CSV to JSON bug fix: strings containing quotes and commas were prematurely cut.
							</p>
							<h5>2016-03-19</h5>
							<p>
								Make the GitHub repository public again. Re-opened to community.
							</p>
							<h5>2015-11-25</h5>
							<p>
								Added options to <a href="/csv2json">CSV to JSON</a>:
							</p>
							<ul>
								<li><strong>Transpose</strong>: You can now transpose the csv data before conversion. </li>
								<li><strong>Output object instead of array</strong>: By default an array of objects is output. You can now output an object or hash. The first column becomes the hash key.</li>
							</ul>
						</div>

			      </div>
			    </div>

  </div>

</div>

<div class="container px-4 py-5" id="confidentiality">

  <h2 class="pb-2 border-bottom">Confidentiality</h2>

  <div class="row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4 py-5">
    <div class="col d-flex align-items-start">
      <div>
        <p>
					Any data pasted and converted on csv<b>json</b> remains local on your computer. Data is never sent to the server.
					<br/>Three exceptions are:
					<ol>
						<li>You upload a file. Data is sent to the server and downloaded back for use. The uploaded file gets deleted and is not tracked.</li>
						<li>You Save a permalink to your session to share with co-workers. Your data gets persisted on the server. It can be deleted by clearing the data and saving again.</li>
						<li>For instrumentation purposes, we save column headers when you convert CSV to JSON. The content is never saved.</li>
					</ol>
				</p>
      </div>
    </div>
  </div>

</div>
