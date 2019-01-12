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