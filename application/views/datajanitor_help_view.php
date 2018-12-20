<div class="container-fluid">
	<div class="row">
		<div class="col-md-12">
			<h1 class="discrete">Online tool for Excel and Google Sheets data cleaning and transformation.</h1>
			<h2>
				<small>
					<ul class="nav nav-tabs" role="tablist">
						<li role="presentation"><a href="/datajanitor">Data/Code</a></li>
						<li role="presentation"><a href="/datajanitor/tips">Tips</a></li>
						<li role="presentation"><a href="/datajanitor/example">Example</a></li>
						<li role="presentation" class="active"><a href="/datajanitor/help">Help</a></li>
					</ul>
				</small>
			</h2>
		</div>
	</div>
	<div class="row">
		<div class="col-md-9 col-sm-8">
			<h4>About</h4>
			<p>
				Are you having to constantly do data cleaning and transformation in Excel?
				Are you repeating those steps over and over?
				Don't you wish you could save those operations and use in other Excel files easily?
			</p>
			<p>
				Data Janitor helps you automate and save data cleaning recipes right in your browser.
				Data Janitor has tons of helpers to handle dates, strings and numbers.
			</p>
			<br/>
			<h4>How it Works</h4>
			<p>
				In Excel or Google Sheets copy an entire worksheet (Ctrl+c).
				in Data Janitor on the Data tab <a href="https://medium.com/@martindrapeau/data-imports-forget-upload-use-copy-and-paste-4567a7ad01e9" target="_blank">paste (Ctrl+v)</a> that data.
				The data gets converted to an array of hash objects, each representing a row.
				The row objects will have as keys the column header names if you've toggle on the <em>auto-detect headers</em> option.
				Otherwise the keys will be the column index starting at 0.
			</p>
			<p>
				The JavaScript <code>process</code> function maps data from <em>Input</em> to <em>Output</em>.
				Once written, you can reuse it on other data sets that uses the same logic for cleaning and transforming data.
			</p>
			<p>
				Function <code>process</code> will be passed as arguments <code>input</code> and <code>columns</code>.
				Column headers (or indices) are passed in array <code>columns</code> for convenience and lookup.
				The <code>process</code> function must return an array of rows where each row is a hash.
				It will get displayed in the <em>Output</em> table. You will be able to copy or download a CSV of the output.
			</p>
			<br/>

			<h4>Helpers</h4>
			<p>
				Libraries <a href="https://underscorejs.org/" target="_blank">Underscore.js</a>, <a href="https://epeli.github.io/underscore.string/" target="_blank">underscore.string</a> and <a href="https://momentjs.com/docs/#/parsing/" target="_blank">Moment.js</a> are available when you write the <code>process</code> function.
				Checkout the Tips tab for common cleaning patterns.
			</p>
			<br/>

			<h4>Data Confidentiality</h4>
			<p>
				Data you paste in Data Clean and code you write is kept on your computer in local storage.
				It is not uploaded to our servers unless you decide to share with colleagues and use the <strong><i class="glyphicon glyphicon-link"></i> Save</strong> link to save your session in order to share with a colleague or save for later.
			</p>
			<br/>

			<h4>Security</h4>
			<p>
				The JavaScript function is run in a sandbox environment using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers" target="_blank">web worker</a>.
				This prevents malicious code from running on your computer.
				It also allows you to stop processing in case there is an infinit loop within the <code>process</code> function.
			</p>
			<br/>

			<h4>BETA Software</h4>
			<p>
				Data Clean is new and still in BETA.
				If you find bugs or have suggestions, please open a <a href="https://github.com/martindrapeau/csvjson-app/issues" target="_blank">GitHub issue</a>.
			</p>
			<br/>

			<h4>Change Log</h4>
			<p><strong>2018-12-19</strong></p>
			<p>Added ability to save session and request service.</p>
			<p><strong>2018-11-30</strong></p>
			<p>Initial BETA release.</p>
			<br/>
		</div>
		<div class="col-md-3 col-sm-4">
			<?php $this->load->view('datajanitor_hire_view'); ?>
		</div>
	</div>
</div>