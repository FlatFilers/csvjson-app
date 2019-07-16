<div class="container home">
	<div class="row">
		<div class="col-md-12">
			<h4>Online tools to convert popular data formats. Persist your session for later, share with co-workers.</h4>
		</div>
	</div>
	<div class="row">
		<div class="col-sm-3">
			<h2 class="text-center"><a href="/csv2json" class="btn btn-primary tool" title="Convert CSV or Excel to JSON.">CSV to JSON</a></h2>
		</div>
		<div class="col-sm-3">
			<h2 class="text-center"><a href="/json2csv" class="btn btn-primary tool" title="Convert JSON to CSV format for Excel.">JSON to CSV</a></h2>
		</div>
		<div class="col-sm-3">
			<h2 class="text-center"><a href="/json_validator" class="btn btn-primary tool" title="Validate and format JSON.">JSON Validator</a></h2>
		</div>
		<div class="col-sm-3">
			<h2 class="text-center"><a href="/json_beautifier" class="btn btn-primary tool" title="Format JSON to make it look awesome.">JSON Beautifier</a></h2>
		</div>
	</div>
	<br/>
	<div class="row">
		<div class="col-md-12">
			<h4>New! Online tools for Excel and Google Sheets data cleaning and transformation and image clipping.</h4>
			<div class="row">
				<div class="col-sm-3">
					<p><a href="/datajanitor" class="btn btn-primary tool" title="Online tool for Excel and Google Sheets data cleaning and transformation.">Data Janitor <sup>BETA</sup></a></p>
				</div>
				<div class="col-sm-3">
					<p><a href="https://clippaint.com" class="btn btn-primary tool" title="Online tool to copy, paste, clip and resize images.">Clip Paint <sup>BETA</sup></a></p>
				</div>
			</div>
		</div>
	</div>
	<br/>
	<div class="row">
		<div class="col-md-12">
			<h4>More tools</h4>
			<p>
				<a href="/sql2json" class="btn btn-primary" title="Convert an SQL export to JSON format.">SQL to JSON</a>
				&nbsp;&nbsp;
				<a href="/csvjson2json" class="btn btn-primary" title="Conversion of the CSVJSON format variant to JSON.">CSVJSON to JSON</a>
				<p>
		</div>
	</div>
	<br/>
	<div class="row">
		<div class="col-md-12">
			<h3>CSV and JSON Data Formats</h3>
			<p>
				CSV and JSON are <a href="https://medium.com/@martindrapeau/the-state-of-csv-and-json-d97d1486333">ubiquitous data formats</a> for the Internet age.
			</p>
			<p>
				CSV or Comma Separated Values is widely used for tabular data and often associated to spreadsheet applications like Excel.
				Many data reporting tool output to CSV format.
				TSV or Tab Separated Values is a close brother used in Clipboards to copy and paste table data to/from Excel for example.
				Find out more about CSV on the <a href="/csv2json">CSV to JSON page</a> by scrolling below the text areas.
			</p>
			<p>
				JSON or JavaScript Object Notation was <a href="https://en.wikipedia.org/wiki/JSON" target="_blank">specified by Douglas Crockford in the early 2000s</a>.
				JSON has become the defacto computer format readable by humans to store structured data. From APIs to configuration files, JSON is now everywhere. Find out more about JSON on the <a href="/json_beautifier">JSON Beautifier page</a> by scrolling below the text areas.
			</p>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<h3>About CSVJSON</h3>
			<blockquote>
				<p>
					As a developer, format conversion is something I sometimes have to do. I often look online for solutions and tools finding they only cover partly my needs.
				</p>
				<p>
					CSVJSON is a do-it-myself and more permanent solution. Its best feature? You can save your session for later, and share it with a co-worker.
				</p>
				<p>
					If you find bugs or would like an improvement, please leave a comment below or open an issue on <a href="https://github.com/martindrapeau/csvjson-app/issues" target="_blank">Github</a>.
				</p>
				<p>
					I hope it can be useful to you. Happy conversions!
				</p>
				<p>--Martin</p>
			</blockquote>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<h3>Confidentiality</h3>
			<p>
				Any data pasted and converted on CSVJSON remains local on your computer.
				Data is never sent to the server. Two exceptions are:
			</p>
			<ol>
				<li>You upload a file. Data is sent to the server and downloaded back for use. The uploaded file gets deleted and is not tracked.</li>
				<li>You <em>Save</em> a permalink to your session to share with co-workers. Your data gets persisted on the server. It can be deleted by clearing the data and saving again.</li>
			</ol>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<h3>Change Log</h3>
			<h4>2019-07-15</h4>
			<p>
				JSON 2 CSV bug fix. BOM was missing causing the lost of accented characters in Excel.
				Fix for <a href="https://github.com/martindrapeau/csvjson-app/issues/78">GitHub issue #78</a>.</li>
				Thanks to <a href="https://github.com/elbaza1">EL BAZA</a> for reporting.
			</p>
			<h4>2019-06-25</h4>
			<p>
				JSON Beautifier improvement. Variable width when inlining short arrays. For fix <a href="https://github.com/martindrapeau/csvjson-app/issues/76">GitHub issue #76</a>.
				Thanks to <a href="https://github.com/galileo-pkm">galileo-pkm</a> for reporting.
			</p>
			<h4>2019-06-06</h4>
			<p>
				Fixed bug where uploading a file went to the result box instead of the json box.
				<a href="https://github.com/martindrapeau/csvjson-app/issues/75">GitHub issue #75</a>.
				Thanks to <a href="https://github.com/ejaustin">Emily</a> for reporting.
			</p>
			<h4>2019-03-20</h4>
			<p>
				<a href="/csv2json">CSV to JSON</a> bug fix: Detect duplicate column headers and make them unique. <a href="https://github.com/martindrapeau/csvjson-app/issues/71">GitHub issue #71</a>. Thanks to <a href="https://github.com/SummerSun">Summer</a> for reporting.
			</p>
			<h4>2019-02-03</h4>
			<p>
				Function <code>json2csv</code> now available as a <a href="https://www.npmjs.com/package/csvjson-json2csv" target="_blank">npm package</a>.
				Function <code>json_beautifier</code> now available as a <a href="https://www.npmjs.com/package/csvjson-json_beautifier" target="_blank">npm package</a>.
			</p>
			<h4>2019-02-02</h4>
			<p>
				Function <code>csv2json</code> now available as a <a href="https://www.npmjs.com/package/csvjson-csv2json" target="_blank">npm package</a>.
			</p>
			<h4>2019-01-26</h4>
			<p>
				Improvement: Removed 64k limit on download button.</li>
			</p>
			<h4>2018-12-26</h4>
			<p>
				Confidentiality statement and improvements on Data Janitor.
			</p>
			<h4>2018-12-01</h4>
			<p>
				Added a new tool <a href="/datajanitor">Data Janitor</a> to perform Excel and Google Sheets data cleaning and transformation.
			</p>
			<h4>2018-11-18</h4>
			<p>
				Added a copy-to-clipboard button and upgraded underscore and backbone to latest versions.
			</p>
			<h4>2018-09-13</h4>
			<p>
				Added a new tool <a href="/json_validator">JSON Validator</a> to validate and format JSON. Integrates a beautiful code editor (CodeMirror) with interactive JSON linting.
			</p>
			<h4>2018-04-03</h4>
			<p>
				Added a new tool <a href="/csvjson2json">CSVJSON to JSON</a> to support conversion of the new <a href="http://csvjson.org/" target="_blank">CSVJSON format</a>, a CSV variant proposed by Dror Harari.
			</p>
			<h4>2018-03-31</h4>
			<p>
				Improvements to CSV converters to support CSVJSON format variant (<a href="http://csvjson.org/" target="_blank">csvjson.org</a>).
			</p>
			<h4>2018-01-24</h4>
			<p>Added a new converter: <a href="/json2csv">JSON to CSV</a>.</p>
			<p>New button to report a bug or ask for improvements.</p>
			<h4>2018-01-08</h4>
			<p>
				Support escaped quotes in <a href="/sql2json">SQL to JSON</a>: <a href="https://github.com/martindrapeau/csvjson-app/issues/26">GitHub issue #26</a>. Thank you <a href="https://github.com/lbottoni" target="_blank">lbottoni</a> for reporting.
			</p>
			<h4>2017-12-18</h4>
			<p>SQL to JSON parsing bug fix. Convert <code>NULL</code> to <code>null</code>.</p>
			<p>
				Added a minify option to compact JSON by removing spaces and new lines. Fix for <a href="https://github.com/martindrapeau/csvjson-app/issues/21" target="_blank">GitHub Issue #21</a>. Thank you <a href="https://github.com/myatmins" target="_blank">Myat Min Soe</a> for requesting this feature.
			</p>
			<h4>2017-12-13</h4>
			<p>
				SQL to JSON parsing bug fix. Do not split when detecting a comma in a string value: <a href="https://github.com/martindrapeau/csvjson-app/issues/25" target="_blank">GitHub Issue #25</a>.
			</p>
			<h4>2017-10-07</h4>
			<p>
				<a href="https://github.com/hisabimbola" target="_blank">Abimbola Idowu</a> added single quote option. <a href="https://github.com/martindrapeau/csvjson-app/issues/23" target="_blank">GitHub issue #23</a>
			</p>
			<h4>2017-09-04</h4>
			<p>
				SQL to JSON parsing bug fix: <a href="https://github.com/martindrapeau/csvjson-app/issues/22" target="_blank">GitHub Issue #22</a>.
			</p>
			<h4>2016-09-27</h4>
			<p>
				CSV to JSON improvement: <a href="https://github.com/martindrapeau/csvjson-app/issues/13" target="_blank">GitHub Issue #13</a> - Added option to parse number values or not to retain original number formatting.
			</p>
			<h4>2016-09-27</h4>
			<p>
				JSON Beautifier bug fix and improvement: <a href="https://github.com/martindrapeau/csvjson-app/issues/12" target="_blank">GitHub Issue #12</a> - Inline short arrays bug fix and improvement. Added nesting depth option.
			</p>
			<h4>2016-08-29</h4>
			<p>
				SQL to JSON bug fix: <a href="https://github.com/martindrapeau/csvjson-app/issues/11" target="_blank">GitHub Issue #11</a> - support multile values in single-line INSERT INTO statement.
			</p>
			<h4>2016-08-22</h4>
			<p>
				JSON Beautifier bug fix: Inline short arrays was not working properly. <a href="https://github.com/martindrapeau/csvjson-app/issues/9">GitHub issue #9</a>
			</p>
			<h4>2016-07-09</h4>
			<p>
				CSV to JSON bug fix: If no text is present in a csv field, it was assigned 0 (zero) by default.
			</p>
			<h4>2016-06-20</h4>
			<p>
				CSV to JSON bug fix: strings containing quotes and commas were prematurely cut.
			</p>
			<h4>2016-03-19</h4>
			<p>
				Make the Github repository public again. Re-opened to community.
			</p>
			<h4>2015-11-25</h4>
			<p>
				Added options to <a href="/csv2json">CSV to JSON</a>:
			</p>
			<ul>
				<li><strong>Transpose</strong>: You can now transpose the csv data before conversion. </li>
				<li><strong>Output object instead of array</strong>: By default an array of objects is output. You can now output an object or hash. The first column becomes the hash key.</li>
			</ul>
			<br/>
			<h3>Bugs and Feature Requests</h3>
			<p>
				<a href="https://github.com/martindrapeau/csvjson-app">Code available on Github.</a>
				Report bugs or ask for improvements through
				<a href="https://github.com/martindrapeau/csvjson-app/issues">Github issues</a>.
			</p>
			<br/>
		</div>
	</div>
	<br/>
</div>