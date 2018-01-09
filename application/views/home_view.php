<div class="container-fluid home">
	<div class="row">
		<div class="col-md-12">
			<h4>Online tools to convert popular data formats. Persist your session for later, share with co-workers.</h4>
		</div>
	</div>
	<br/>
	<div class="row">
		<div class="col-md-4">
			<h2 class="text-center"><a href="/csv2json" class="btn btn-primary tool">CSV to JSON</a></h2>
		</div>
		<div class="col-md-4">
			<h2 class="text-center"><a href="/sql2json" class="btn btn-primary tool">SQL to JSON</a></h2>
		</div>
		<div class="col-md-4">
			<h2 class="text-center"><a href="/json_beautifier" class="btn btn-primary tool">JSON Beautifier</a></h2>
		</div>
	</div>
	<br/>
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
					If you find bugs or would like an improvement, please leave a comment below.
				</p>
				<p>
					I hope it can be useful to you. Happy conversions!
				</p>
				<p>--Martin</p>
			</blockquote>
		</div>
	</div>
	<div class="row">
		<div class="col-md-6">
			<h3>Change Log</h3>
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
				Report bugs or ask for improvements either through
				<a href="https://github.com/martindrapeau/csvjson-app/issues">Github issues</a>
				or by leaving a Disqus comment.
			</p>
			<br/>
		</div>
		<div class="col-md-6">
			<h3>Feedback</h3>
			<div id="disqus_thread"></div>
			<script>
			var disqus_config = function () {
				this.page.url = 'http://www.csv2json.com';
				this.page.identifier = 'csv2json';
			};
			(function() { // DON'T EDIT BELOW THIS LINE
				var d = document, s = d.createElement('script');

				s.src = '//csv2json.disqus.com/embed.js';

				s.setAttribute('data-timestamp', +new Date());
				(d.head || d.body).appendChild(s);
			})();
			</script>
			<noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript" rel="nofollow">comments powered by Disqus.</a></noscript>
		</div>
	</div>
	<br/>
</div>