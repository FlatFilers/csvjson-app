<div class="container home">
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
			<h4>2016-08-22</h4>
			<p>
				Bug fix: Inline short arrays was not working properly. <a href="https://github.com/martindrapeau/csvjson-app/issues/9">GitHub issue #9</a>
			</p>
			<h4>2016-07-09</h4>
			<p>
				Bug fix in CSV conversion : If no text is present in a csv field, it was assigned 0 (zero) by default.
			</p>
			<h4>2016-06-20</h4>
			<p>
				Bug fix in CSV conversion: strings containing quotes and commas were prematurely cut.
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