<h2>SpaceX NASA Launches to the ISS</h2>
<p class="lead">Data Janitor Example</p>
<p>
	SpaceX has its <a href="https://www.spacex.com/missions" target="_blank">flight manifest</a> directly on their website. The objective is to extract NASA launches to the International Space Station and determine the number of days between those launches.
</p>
<p>
  First step is to copy the data from the SpaceX Manifest web page, and paste it into Data Janitor.
</p>
<div class="row">
  <div class="col-md-8 col-sm-10 col-xs-12">
    <img class="img-responsive" src="https://s3.us-east-2.amazonaws.com/csvjson/images/data-janitor-spacex.gif" alt="Copy/paste SpaceX manifest data into CSVJSON Data Janitor" />
  </div>
</div>
<br/>

<p>Second step is to write the JavaScript function to transform that data. It is necessary to sort rows by launch date in order to calculate days elapsed. I wrote a special function <code>sortByDate</code> for sorting. It uses Underscore.js's <code>sortBy</code> to do that. The comparator function uses Moment.js's <code>unix</code> function to convert to a timestamp. Notice that only NASA launches are processed.</p>
<pre>
function sortByDate(list, column, descending) {
  return _.sortBy(list, function(o) {
    return moment(o[column]).unix() * (descending ? -1 : 1);
  });
}
function process(input, columns) {
  input = sortByDate(input, 'LAUNCH DATE');
  var output = [];
  var lastDate;
  input.forEach(function(inRow, r) {
    if (inRow.CUSTOMER.indexOf('NASA RESUPPLY TO ISS') >= 0) {
      var date = moment(inRow['LAUNCH DATE']);
      outRow = {
        Launch: date.format('LL'),
        'Days since last launch': lastDate ? date.diff(lastDate, 'days') : '',
        Customer: inRow['CUSTOMER'],
        Site: inRow['LAUNCH SITE'],
        Vehicle: inRow['VEHICLE']
      };
      lastDate = date;
      output.push(outRow);
    }
  });
  return sortByDate(output, 'Launch', true);
}
</pre>

<p>And the output. Notice we are missing flight 7. This relates to <a href="https://en.wikipedia.org/wiki/SpaceX_CRS-7" target="_blank">flight CRS-7</a>, where Falcon disintegrated 139 seconds into flight on June 28 2015.</p>
<table class="table table-bordered backgrid output">
    <thead>
        <tr>
            <th class="sortable renderable __Row">
                <button><span class="sort-caret" aria-hidden="true"></span></button>
            </th>
            <th class="sortable renderable Launch">
                <button>Launch<span class="sort-caret" aria-hidden="true"></span></button>
            </th>
            <th class="sortable renderable Days since last launch">
                <button>Days since last launch<span class="sort-caret" aria-hidden="true"></span></button>
            </th>
            <th class="sortable renderable Customer">
                <button>Customer<span class="sort-caret" aria-hidden="true"></span></button>
            </th>
            <th class="sortable renderable Site">
                <button>Site<span class="sort-caret" aria-hidden="true"></span></button>
            </th>
            <th class="sortable renderable Vehicle">
                <button>Vehicle<span class="sort-caret" aria-hidden="true"></span></button>
            </th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="reporting-cell sortable renderable">1</td>
            <td class="reporting-cell sortable renderable">June 29, 2018</td>
            <td class="reporting-cell sortable renderable">88</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 15)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">2</td>
            <td class="reporting-cell sortable renderable">April 2, 2018</td>
            <td class="reporting-cell sortable renderable">108</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 14)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">3</td>
            <td class="reporting-cell sortable renderable">December 15, 2017</td>
            <td class="reporting-cell sortable renderable">123</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 13)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">4</td>
            <td class="reporting-cell sortable renderable">August 14, 2017</td>
            <td class="reporting-cell sortable renderable">72</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 12)</td>
            <td class="reporting-cell sortable renderable">KENNEDY SPACE CENTER (39A)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">5</td>
            <td class="reporting-cell sortable renderable">June 3, 2017</td>
            <td class="reporting-cell sortable renderable">104</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 11)</td>
            <td class="reporting-cell sortable renderable">KENNEDY SPACE CENTER (39A)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">6</td>
            <td class="reporting-cell sortable renderable">February 19, 2017</td>
            <td class="reporting-cell sortable renderable">216</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 10)</td>
            <td class="reporting-cell sortable renderable">KENNEDY SPACE CENTER (39A)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">7</td>
            <td class="reporting-cell sortable renderable">July 18, 2016</td>
            <td class="reporting-cell sortable renderable">101</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 9)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">8</td>
            <td class="reporting-cell sortable renderable">April 8, 2016</td>
            <td class="reporting-cell sortable renderable">360</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 8)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">9</td>
            <td class="reporting-cell sortable renderable">April 14, 2015</td>
            <td class="reporting-cell sortable renderable">94</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 6)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">10</td>
            <td class="reporting-cell sortable renderable">January 10, 2015</td>
            <td class="reporting-cell sortable renderable">111</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 5)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">11</td>
            <td class="reporting-cell sortable renderable">September 21, 2014</td>
            <td class="reporting-cell sortable renderable">156</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 4)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">12</td>
            <td class="reporting-cell sortable renderable">April 18, 2014</td>
            <td class="reporting-cell sortable renderable">413</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 3)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">13</td>
            <td class="reporting-cell sortable renderable">March 1, 2013</td>
            <td class="reporting-cell sortable renderable">144</td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 2)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
        <tr>
            <td class="reporting-cell sortable renderable">14</td>
            <td class="reporting-cell sortable renderable">October 8, 2012</td>
            <td class="reporting-cell sortable renderable"></td>
            <td class="reporting-cell sortable renderable">NASA RESUPPLY TO ISS (FLIGHT 1)</td>
            <td class="reporting-cell sortable renderable">CAPE CANAVERAL (40)</td>
            <td class="reporting-cell sortable renderable">DRAGON &amp; FALCON 9</td>
        </tr>
    </tbody>
</table>