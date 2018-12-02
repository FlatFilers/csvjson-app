<div class="row">
	<div class="col-md-9">
		<h4>Cleaning Dates</h4>
		<p><a href="https://momentjs.com/docs/#/parsing/" target="_blank">Moment.js</a> is available in global function <code>moment()</code> to help you parse and format dates.</p>
		<pre>
// Parse a string as date and verify it's valid
moment('2012-01-12').isValid(); // true
moment('lorem ipsum').isValid(); // false

// Parse a known date format and convert to another format
moment('09-12-24', 'YY-MM-DD').format('MMM Do YYYY'); // 'Dec 24th 2009'
</pre>
		<p>By default, the locale loaded is English <code>en</code>.</p>
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
	</div>
	<div class="col-md-3">
		<?php $this->load->view('dataclean_hire_view'); ?>
	</div>
</div>