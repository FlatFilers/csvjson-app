<div class="container-fluid">
	<div class="row">
		<div class="col-md-9 col-sm-8">
			<h1 class="discrete">Online tool for Excel and Google Sheets data cleaning and transformation.</h1>
			<p>1) Copy (Ctrl+c) your data from Excel or Google Sheets. 2) Paste it on this page (Ctrl+v). 3) Adapt the JavaScript <code>process</code> function for data cleaning and transformation. 4) Copy/download the result.</p>
		</div>
		<div class="col-md-3 col-sm-4 text-right">
			<button class="btn btn-primary hire hidden">Service Request</button>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<h2>
				<small>
					<ul class="nav nav-tabs" role="tablist">
						<li role="presentation" class="active"><a href="#tab-data" role="tab" data-toggle="tab">Data</a></li>
						<li role="presentation"><a href="#tab-code" role="tab" data-toggle="tab">Clean &amp; Transform</a></li>
						<li role="presentation" class="pull-right"><a href="#tab-tips" role="tab" data-toggle="tab">Tips</a></li>
						<li role="presentation" class="pull-right"><a href="#tab-example" role="tab" data-toggle="tab">Example</a></li>
						<li role="presentation" class="pull-right"><a href="#tab-help" role="tab" data-toggle="tab">Help</a></li>
					</ul>
				</small>
			</h2>

			<div class="tab-content">
				<div role="tabpanel" class="tab-pane fade in active" id="tab-data"></div>
				<div role="tabpanel" class="tab-pane fade" id="tab-code"></div>
				<div role="tabpanel" class="tab-pane fade" id="tab-help">
					<?php $this->load->view('datajanitor_help_view'); ?>
				</div>
				<div role="tabpanel" class="tab-pane fade" id="tab-example">
					<?php $this->load->view('datajanitor_example_view'); ?>
				</div>
				<div role="tabpanel" class="tab-pane fade" id="tab-tips">
					<?php $this->load->view('datajanitor_tips_view'); ?>
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