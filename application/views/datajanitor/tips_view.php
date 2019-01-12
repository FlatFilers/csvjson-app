<h1>Data Janitor Tips</h1>
<p>
  Libraries <a href="https://underscorejs.org/" target="_blank">Underscore.js</a>, <a href="https://epeli.github.io/underscore.string/" target="_blank">underscore.string</a> and <a href="https://momentjs.com/docs/#/parsing/" target="_blank">Moment.js</a> are loaded and available along with vanilla JavaScript to help you transform and clean data.
</p>
<br/>

<h2>Cleaning dates</h2>
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

<h2>Validating emails</h2>
<p>I provide a helper method <code>_.isEmail(email)</code> that you can call to check if an email is valid.</p>
<pre>
_.isEmail('jean françois@example.com') // false
_.isEmail('martindrapeau@gmail.com') // true
</pre>
<br/>

<h2>Handling strings</h2>
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

<h2>Reordering columns</h2>
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
<br/>

<h2>Sorting rows</h2>
<p>Assuming we have this input table:</p>
<div class="row">
  <div class="col-md-6 col-sm-10">
    <table class="table table-bordered table-condensed">
      <thead>
        <tr>
          <th>Id</th>
          <th>Holiday</th>
          <th>Day of week</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>New Year's Day</td>
          <td>Tuesday</td>
          <td>January 1, 2019</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Good Friday</td>
          <td>Friday</td>
          <td>April 19, 2019</td>
        </tr>
        <tr>
          <td>3</td>
          <td>Easter Monday</td>
          <td>Monday</td>
          <td>April 22, 2019</td>
        </tr>
        <tr>
          <td>4</td>
          <td>Victoria Day/National Patriots Day</td>
          <td>Monday</td>
          <td>May 20, 2019</td>
        </tr>
        <tr>
          <td>5</td>
          <td>Quebec national Holiday</td>
          <td>Monday</td>
          <td>June 24, 2019</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
<p>
  Using Underscore.js's <a href="https://underscorejs.org/#sortBy" target="_blank">sortBy()</a> function to sort on a column.
  <br/>
  <em>Note: This will return a copy of the input array. Hence we need to reassign it.</em>
</p>
<pre>
// Sort by Id in ascending order
input = _.sortBy(input, 'Id');

// Sort by Id in desceding order
input = _.sortBy(input, function(o) {
  return -o.Id;
});

// Sort by date
input = _.sortBy(input, function(o) {
  return moment(o.Date).unix();
});
</pre>

<p>
  To sort by name, alphanumerically, we may combine JavaScript's <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort" target="_blank">Array.prototype.sort()</a> method with underscore.string's <a href="https://epeli.github.io/underscore.string/#naturalcmp-string1-string2-gt-number" target="_blank">naturalCmp(string1, string2)</a> function.
  <br/>
  <em>Note: In this case the array is sorted in place - no need to reassign it.</em>
</p>
<pre>
input.sort(function(o1, o2) {
  return s.naturalCmp(o1.Holiday, o2.Holiday);
});
</pre>
<br/>

<h2>Throwing errors</h2>
<p>
  If you encounter unfixable data, you can stop processing by throwing an error.
  For example, if an email is bad:
</p>
<pre>
if (!_.isEmail(inRow.Email)) throw 'Not an email ' + inRow.Email + ' on row ' + (r+1);
</pre>
<p class="text-center">
  <img class="img-responsive" src="https://s3.us-east-2.amazonaws.com/csvjson/images/data-janitor-throw.png" alt="Data Janitor trow an error" />
</p>
<p>
  <em>Note 1: I recommended to be very strict at first. As you clean the data, handle each edge case iteratively.</em>
</p>
<p>
  <em>Note 2: It is useful to pass the erroneous email and the row in the message to help you pinpoint the source.</em>
</p>
<br/>
<br/>