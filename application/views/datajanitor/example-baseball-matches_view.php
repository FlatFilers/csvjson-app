<h2>Baseball Matches</h2>
<p class="lead">Data Janitor Example</p>
<p>Let's say we have a table of game matches copied and pasted from Excel. This is the input table.</p>
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
<p>The output will be an array of rows; a list of hash objects like this:</p>
<pre>
[
  {
    "Home": "Twins",
    "Away": "Yankees",
    "Date": "Oct 3rd 2017",
    "Home Score": 4,
    "Away Score": 8,
    "Winner": "Yankees"
  },
  {
    "Home": "Rockies",
    "Away": "Diamondbacks",
    "Date": "Oct 4th 2017",
    "Home Score": 8,
    "Away Score": 11,
    "Winner": "Diamondbacks"
  },
  {
    "Home": "Red Sox",
    "Away": "Astros",
    "Date": "Oct 5th 2017",
    "Home Score": 2,
    "Away Score": 8,
    "Winner": "Astros"
  }
]
</pre>
<p>The Output table will contain a tabular representation of this data. You can copy/paste it back to Excel or download it as CSV.</p>
<br/>