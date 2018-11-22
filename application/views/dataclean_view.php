<div class="container-fluid">
	<div class="row">
		<div class="description col-md-12">
			<h1 class="discrete">Online tool to clean and transform Excel and Google Sheets data.</h1>
			<ol class="list-inline">
				<li>1) Copy selected data from Excel or Google Sheets and paste here.</li>
				<li>2) Adapt and run the JavaScript function to clean and transform.</li>
				<li>3) Copy result data back to Excel or Google Sheets.</li>
				<li>4) Save your session for later use.</li>
			</ol>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<h2>
				<small>
					<ul class="nav nav-tabs" role="tablist">
						<li role="presentation" class="active"><a href="#tab-input" role="tab" data-toggle="tab">Input</a></li>
						<li role="presentation"><a href="#tab-code" role="tab" data-toggle="tab">Clean &amp; Transform</a></li>
						<li role="presentation"><a href="#tab-output" role="tab" data-toggle="tab">Output</a></li>
						<li role="presentation"><a href="#tab-help" role="tab" data-toggle="tab">Help</a></li>
					</ul>
				</small>
			</h2>

			<div class="tab-content">
				<div role="tabpanel" class="tab-pane fade in active" id="tab-input"></div>
				<div role="tabpanel" class="tab-pane fade" id="tab-code"></div>
				<div role="tabpanel" class="tab-pane fade" id="tab-output"></div>
				<div role="tabpanel" class="tab-pane fade" id="tab-help">
					<h4>How it Works</h4>
					<p>
						The JavaScript <code>process</code> function maps data from <em>Input</em> to <em>Output</em>.
						Once written, you can reuse it on other data sets that uses the same logic for cleaning and transforming data.
					</p>
					<p>
						Function <code>process</code> will be passed as arguments <code>input</code> and <code>columns</code>. The first is an array of objects, each representing a row of input data. The objects have as keys the column headers. Column headers are also passed in array <code>columns</code> for conveniance and lookup.
					</p>
					<br/>

					<h4>Helpers</h4>
					<p>
						Libraries <a href="https://underscorejs.org/" target="_blank">Underscore.js</a> and <a href="" target="_blank">Moment.js</a> are available when you write the <code>process</code> function.
						Consult respective docs for usage.
					</p>
					<br/>

					<h4>Hire Me!</h4>
					<p>
						Want help to write the <code>process</code> function to clean and transform your data?
						Email me and I'll be happy to write it for you for a fee.
					</p>
					<p>
						<a class="btn btn-primary" href="mailto:martindrapeau@gmail.com&subject=dataclean"><i class="glyphicon glyphicon-envelope"></i> martindrapeau@gmail.com</a>
					</p>
					<br/>

					<h4>BETA Software</h4>
					<p>
						Data Clean is new and still in BETA.
						If you find bugs or have suggestions, please open a <a href="https://github.com/martindrapeau/csvjson-app/issues" target="_blank">GitHub issue</a>.
					</p>
				</div>
			</div>

		</div>
	</div>
	<br/>
	<br/>

</div>