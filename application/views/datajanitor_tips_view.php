<div class="container-fluid">
	<div class="row">
		<div class="col-md-12">
			<h1 class="discrete">Online tool for Excel and Google Sheets data cleaning and transformation.</h1>
			<h2>
				<small>
					<ul class="nav nav-tabs" role="tablist">
						<li role="presentation"><a href="/datajanitor">Data/Code</a></li>
						<li role="presentation" class="active"><a href="/datajanitor/tips">Tips</a></li>
						<li role="presentation"><a href="/datajanitor/example">Example</a></li>
						<li role="presentation"><a href="/datajanitor/help">Help</a></li>
					</ul>
				</small>
			</h2>
		</div>
	</div>
	<div class="row">
		<div class="col-md-9 col-sm-8">
			<h4>Cleaning Dates</h4>
			<p><a href="https://momentjs.com/docs/#/parsing/" target="_blank">Moment.js</a> is available in global function <code>moment()</code> to help you parse and format dates.</p>
			<pre>
// Parse a string as date and verify it's valid
moment('2012-01-12').isValid(); // true
moment('lorem ipsum').isValid(); // false

// Parse a known date format and convert to another format
moment('09-12-24', 'YY-MM-DD').format('MMM Do YYYY'); // 'Dec 24th 2009'
</pre>
			<p>By default, the locale loaded is English <code>en</code>. You can use the <code>locale</code> method to switch to another language:</p>
			<pre>
// Change to French and parse a date
moment.locale('fr'); // Returns 'fr'
var d = moment('25 février 2018', 'DD MMM YYYY');
d.isValid(); // true

// Format in English
d.locale('en');
d.format('LL'); // February 25, 2018
</pre>
			<br/>

			<h4>Handling strings</h4>
			<p>Lots can be done with vanilla JavaScript</p>
			<pre>
// Split a string based on a separator
'Red Sox vs Astros'.split('vs'); // ['Red Sox', 'Astros']

// Split a string based on a case insensitive separator
'Red Sox VS Astros'.split(new RegExp('\\s+' + 'vs' + '\\s+', 'i')); // ['Red Sox', 'Astros']

// Convert to lower case
'RED SOX vs ASTROS'.toLowerCase(); // 'red sox vs astros'
</pre>

			<p><a href="https://epeli.github.io/underscore.string/" target="_blank">Underscore.string</a> functions are available in the global namespace <code>s</code> to help you to handle strings.</p>
			<pre>
// Remove diacritics (accents) from a string
s.cleanDiacritics('Élévation'); // Elevation

// Break a string into an array of words
s.words('Hello my friend'); // ['Hello', 'my', 'friend']

// Reformat as an English title
s.titlize('RED SOX vs ASTROS'); // 'Red Sox Vs Astros'

// Clean a string before comparison
s.cleanDiacritics(' Élévation ').toLowerCase().trim() == 'elevation'; // true
</pre>
			<br/>

			<h4>Reordering columns</h4>
			<p>Columns are ordered as you create them. For instance, consider this:</p>
			<pre>
// Input
[{
  "Last Name": "Doe",
  "Dob": "25 March 2001",
  "First Name": "John"
}]

// Process function
function process(input, columns) {
  var output = [];
  input.forEach(function(inRow, r) {
    var outRow = {};
    outRow['First Name'] = inRow['First Name'];
    outRow['Last Name'] = inRow['Last Name'];
    outRow['Dob'] = inRow['Dob'];
      
    output.push(outRow);
  });
  return output;
}

// Output
[{
  "First Name": "John",
  "Last Name": "Doe",
  "Dob": "25 March 2001"
}]
</pre>
		</div>
		<div class="col-md-3 col-sm-4">
			<?php $this->load->view('datajanitor_hire_view'); ?>
		</div>
	</div>
</div>