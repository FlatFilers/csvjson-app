<h2>About Data Janitor</h2>
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
<h2>How it Works</h2>
<p>
	In Excel or Google Sheets copy an entire worksheet (Ctrl+c).
	In Data Janitor on the Data tab <a href="https://medium.com/@martindrapeau/data-imports-forget-upload-use-copy-and-paste-4567a7ad01e9" target="_blank">paste (Ctrl+v)</a> that data.
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

<h2>Helpers</h2>
<p>
	Libraries <a href="https://underscorejs.org/" target="_blank">Underscore.js</a>, <a href="https://epeli.github.io/underscore.string/" target="_blank">underscore.string</a> and <a href="https://momentjs.com/docs/#/parsing/" target="_blank">Moment.js</a> are available when you write the <code>process</code> function.
	In addition, you can validate an email with <code>_.isEmail(email)</code>. It will return <code>true</code> or <code>false</code>.
	Checkout the <a href="/datajanitor/docs/tips">Tips section</a> for common cleaning patterns.
</p>
<br/>

<h2>Data Confidentiality</h2>
<p>
	Data you paste and code your write in the <strong>Sandbox session</strong> is kept on your computer; in the browser's local storage.
	It is not uploaded to the server.
</p>
<p>
	Use the <strong><i class="glyphicon glyphicon-link"></i> Save</strong> link to save your session to the server.
	You can share the link to that session with co-workers or bookmark it for later.
</p>
<p>
	You can delete a saved session from the server at any time.
	This will not delete all data from computers of people you have shared it with.
	You will need to ask them to delete the saved session as well.
</p>
<br/>

<h2>Security</h2>
<p>
	The JavaScript function is run in a sandbox environment using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers" target="_blank">web worker</a>.
	This prevents malicious code from running on your computer.
	It also allows you to stop processing in case there is an infinit loop within the <code>process</code> function.
</p>
<br/>

<h2>BETA Software</h2>
<p>
	Data Clean is new and still in BETA.
	If you find bugs or have suggestions, please open a <a href="https://github.com/FlatFilers/csvjson-app/issues" target="_blank">GitHub issue</a>.
</p>
<br/>

<h2>Change Log</h2>
<p><strong>Jan 26, 2019</strong></p>
<p>Removed 64k limit on download button.</p>
<p><strong>Dec 31 2018</strong></p>
<p>Added ability to name saved sessions.</p>
<p><strong>Dec 25 2018</strong></p>
<p>Expose sessions in UI.</p>
<p><strong>Dec 19 2018</strong></p>
<p>Added ability to save session and request service.</p>
<p><strong>Nov 11 2018</strong></p>
<p>Initial BETA release.</p>
<br/>
