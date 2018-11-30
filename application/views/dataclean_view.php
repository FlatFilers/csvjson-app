<div class="container-fluid">
	<div class="row">
		<div class="col-md-12">
			<h1 class="discrete">Online tool to clean and transform Excel and Google Sheets data.</h1>
			<p>1) Copy (Ctrl+c) your data from Excel or Google Sheets. 2) Paste it on this page (Ctrl+v). 3) Adapt the JavaScript <code>process</code> function. 4) Copy/download the result.</p>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<h2>
				<small>
					<ul class="nav nav-tabs" role="tablist">
						<li role="presentation" class="active"><a href="#tab-data" role="tab" data-toggle="tab">Data</a></li>
						<li role="presentation"><a href="#tab-code" role="tab" data-toggle="tab">Clean &amp; Transform</a></li>
						<li role="presentation"><a href="#tab-help" role="tab" data-toggle="tab">Help</a></li>
					</ul>
				</small>
			</h2>

			<div class="tab-content">
				<div role="tabpanel" class="tab-pane fade in active" id="tab-data"></div>
				<div role="tabpanel" class="tab-pane fade" id="tab-code"></div>
				<div role="tabpanel" class="tab-pane fade" id="tab-help">
					<div class="row">
						<div class="col-md-7">
							<h4>How it Works</h4>
							<p>
								The JavaScript <code>process</code> function maps data from <em>Input</em> to <em>Output</em>.
								Once written, you can reuse it on other data sets that uses the same logic for cleaning and transforming data.
							</p>
							<p>
								Function <code>process</code> will be passed as arguments <code>input</code> and <code>columns</code>. The first is an array of objects, each representing a row of input data. The objects have as keys the column headers. Column headers are also passed in array <code>columns</code> for convenience and lookup.
							</p>
							<br/>

							<h4>Helpers</h4>
							<p>
								Libraries <a href="https://underscorejs.org/" target="_blank">Underscore.js</a> and <a href="" target="_blank">Moment.js</a> are available when you write the <code>process</code> function.
								Consult respective docs for usage.
							</p>
							<br/>

							<h4>Example</h4>
							<p>Let's say we have a table of game matches. This is the input table.</p>
							<table class="table table-bordered">
								<thead>
									<tr> <th>Match</th> <th>Date</th> <th>Result</th> </tr>
								</thead>
								<tbody>
									<tr> <td>Twins vs Yankees</td> <td>17-10-03</td> <td>4 - 8</td> </tr>
									<tr> <td>Rockies vs Diamondbacks</td> <td>17-10-04</td> <td>8 - 11</td> </tr>
									<tr> <td>Red Sox vs Astros</td> <td>17-10-05</td> <td>2 - 8</td> </tr>
								</tbody>
							</table>
							<p>We would like to split up the teams and match results. We also want to format the date differently. To something like this:</p>
							<table class="table table-bordered">
								<thead>
									<tr> <th>Home</th> <th>Away</th> <th>Date</th> <th>Home Score</th> <th>Away Score</th> <th>Winner</th> </tr>
								</thead>
								<tbody>
									<tr> <td>Twins</td> <td>Yankees</td> <td>3 Oct 2017</td> <td>4</td> <td>8</td> <td>Yankees</td> </tr>
									<tr> <td>Rockies</td> <td>Diamondbacks</td> <td>4 Oct 2017</td> <td>8</td> <td>11</td> <td>Diamondbacks</td> </tr>
									<tr> <td>Red Sox</td> <td>Astros</td> <td>5 Oct 2017</td> <td>2</td> <td>8</td> <td>Astros</td> </tr>
								</tbody>
							</table>

							<p>Function call <code>process(input, columns)</code> will be passed:</p>
							<p><code>input</code></p>
							<pre>
[
  {
    "Match": "Twins vs Yankees",
    "Date": "17-10-03",
    "Result": "4 - 8"
  },
  {
    "Match": "Rockies vs Diamondbacks",
    "Date": "17-10-04",
    "Result": "8 - 11"
  },
  {
    "Match": "Red Sox vs Astros",
    "Date": "17-10-05",
    "Result": "2 - 8"
  }
]
</pre>
							<p><code>columns</code></p>
							<pre>
["Match", "Date", "Result"]
</pre>
							<p>We could write the <code>process</code> function as such:</p>
							<pre>
function process(input, columns) {
  var output = [];
  input.forEach(function(inRow, r) {
    var outRow = {};
    
    var teams = inRow.Match.split('vs');
    outRow.Home = teams[0].trim();
    outRow.Away = teams[1].trim();
    
    var date = moment(inRow.Date, 'YY-MM-DD');
    outRow.Date = date.format('MMM Do YYYY');
    
    var scores = inRow.Result.split('-');
    outRow['Home Score'] = parseInt(scores[0].trim(), 10);
    outRow['Away Score'] = parseInt(scores[1].trim(), 10);
    
    outRow.Winner = outRow['Home Score'] > outRow['Away Score'] ? outRow.Home : outRow.Away;
    if (outRow['Home Score'] == outRow['Away Score']) outRow.Winner = 'Tie';

    output.push(outRow);
  });
  return output;
}
</pre>
							<br/>
						</div>

						<div class="col-md-5">
							<h4>Hire Me!</h4>
							<p>
								Want help to write the <code>process</code> function to clean and transform your data?
								Email me and I'll be happy to quote you.
							</p>
							<p>
								<a class="btn btn-primary" href="mailto:martindrapeau@gmail.com&subject=dataclean"><i class="glyphicon glyphicon-envelope"></i> martindrapeau@gmail.com</a>
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
						</div>
					</div>

				</div>
			</div>

		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<?php $this->load->view('carbonads'); ?>
		</div>
	</div>
	<br/>
	<br/>
<pre id="example-data" style="display:none;">
Match	Date	Result
Twins vs Yankees	17-10-03	4 - 8
Rockies vs Diamondbacks	17-10-04	8 - 11
Red Sox vs Astros	17-10-05	2 - 8</pre>
<pre id="example-code" style="display:none;">
function process(input, columns) {
  var output = [];
  input.forEach(function(inRow, r) {
    var outRow = {};
    
    var teams = inRow.Match.split('vs');
    outRow.Home = teams[0].trim();
    outRow.Away = teams[1].trim();
    
    var date = moment(inRow.Date, 'YY-MM-DD');
    outRow.Date = date.format('MMM Do YYYY');
    
    var scores = inRow.Result.split('-');
    outRow['Home Score'] = parseInt(scores[0].trim(), 10);
    outRow['Away Score'] = parseInt(scores[1].trim(), 10);
    
    outRow.Winner = outRow['Home Score'] > outRow['Away Score'] ? outRow.Home : outRow.Away;
    if (outRow['Home Score'] == outRow['Away Score']) outRow.Winner = 'Tie';

    output.push(outRow);
  });
  return output;
}
</pre>
<pre id="bare-data" style="display:none;">
Column
Copy and paste data here</pre>
<pre id="bare-code" style="display:none;">
function process(input, columns) {
	var output = [];
	input.forEach(function(inRow, r) {
		// Change this code
		var outRow = inRow;
		output.push(outRow);
	});
	return output;
}
</pre>
</div>