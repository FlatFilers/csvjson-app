<h2>Import Contacts into a CRM</h2>
<p class="lead"><a href="/datajanitor/clone_example/players" target="_blank"><i class="glyphicon glyphicon-share"></i> Load this example in Data Janitor</a></p>
<p>
	Importing people in a CRM via an Excel spreadsheet is a very common pattern.
	The original data is usually exported from another system and needs to be mapped.
	Data Janitor shines in doing so in a repeatable fashion.
</p>
	In this particular example we want to import players of a league into Amilia.
	The orignal spreadsheet has 5 tabs with 50+ players on each:
</p>
<div class="row">
  <div class="col-md-8 col-sm-10 col-xs-12">
    <img class="img-responsive" src="https://s3.us-east-2.amazonaws.com/csvjson/images/data-janitor-players-input.png" alt="Players to import in Amilia" />
  </div>
</div>
<br/>

<p>
	The Amilia import template is also an Excel but in a different format.
	Its a single sheet that looks like this:
</p>
<div class="row">
  <div class="col-md-8 col-sm-10 col-xs-12">
    <img class="img-responsive" src="https://s3.us-east-2.amazonaws.com/csvjson/images/data-janitor-players-output.png" alt="Amilia import Excel template" />
  </div>
</div>
<br/>

<h3>Strategy</h3>
<p>
	We will perform 5 different imports. Using Data Janitor, we will write a JavaScript function that maps from one format to the other. The function will ignore empty rows and raise warnings when the data is bad.
</p>
<pre>
function cleanName(name) {
  return (name||'').replace('?','').trim();
}
function process(input, columns) {
  var output = [];
  input.forEach(function(inRow, r) {
    if (!inRow.First) return true;
    var outRow = {};
    
    outRow['First Name'] = cleanName(inRow.First);
    
    // Last name is sometimes empty - use the first
    outRow['Last Name'] = cleanName(inRow.Last) || outRow.First;
    
    outRow.Gender = inRow["Male/Female"] == 'Male' ? 'M' : 'F';
    
    // Dates are not provided but necessary - put whatever
    outRow["Date of Birth"] = '2000-01-01';
    outRow["Join Date"] = '2018-01-01';
    
    if (!_.isEmail(inRow.Email)) throw 'Not an email ' + inRow.Email + ' on row ' + r;
    outRow.email = inRow.Email || '';
    
    outRow.Activity = team2activity(inRow.Team);
      
    output.push(outRow);
  });
  return output;
}
function team2activity(team) {
  var data = [{"Activity":"Équipes Automne-Hiver 2018-2019::Futsal::Mercredi profutsal::FC LaTchass","Team":"FC LaTchass"},{"Activity":"Équipes Automne-Hiver 2018-2019::Futsal::Mercredi profutsal::FC Pointu","Team":"FC Pointu"},{"Activity":"Équipes Automne-Hiver 2018-2019::Futsal::Mercredi profutsal::Hrissa","Team":"Hrissa"},{"Activity":"Équipes Automne-Hiver 2018-2019::Futsal::Mercredi profutsal::Les Imbattables LSJ","Team":"Les Imbattables LSJ"},{"Activity":"Équipes Automne-Hiver 2018-2019::Futsal::Mercredi profutsal::PassionTeam mercredi profutsal","Team":"PassionTeam"},{"Activity":"Équipes Automne-Hiver 2018-2019::Futsal::Mercredi profutsal::Raging Lombrics","Team":"Ranging Lombrics"}];
  var o = _.findWhere(data, {Team:team});
  return o ? o.Activity : '';
}
</pre>
<br/>

<p>
	On the Code tab, running this will show us the mapped data, row by row. We can spot bad emails by using the <code>_.isEmail(email)</code> helper and throwing an exception.
</p>
<div class="row">
  <div class="col-md-8 col-sm-10 col-xs-12">
    <img class="img-responsive" src="https://s3.us-east-2.amazonaws.com/csvjson/images/data-janitor-throw.png" alt="Throwing an error to stop processing in Data Janitor" />
  </div>
</div>
<br/>

<p>As a result we obtain this data mapped. We can copy the output to clipboard and paste into the Amilia Excel file for import.</p>
<div class="row">
  <div class="col-md-8 col-sm-10 col-xs-12">
    <img class="img-responsive" src="https://s3.us-east-2.amazonaws.com/csvjson/images/data-janitor-players-result.png" alt="" />
  </div>
</div>

<br/>
<br/>