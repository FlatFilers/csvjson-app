(function() {
	/**
	 *
	 * CSVJSON.csv2json(csv, options)
	 *
	 * Converts CSV to JSON. Returns an object. Use JSON.stringify to conver to a string.
	 *
	 * Available options:
	 *  - separator: Optional. Character which acts as separator. If omitted,
	 *               will attempt to detect comma (,), semi-colon (;) or tab (\t).
	 *
	 * Dependencies: 
	 *  - underscore (http://underscorejs.org/)
	 *  - underscore.string (https://github.com/epeli/underscore.string)
	 *
	 * Copyright (c) 2014 Martin Drapeau
	 *
	 */
	
	var errorDetectingSeparator = "We could not detect the separator.",
		errorEmpty = "Please upload a file or type in something.",
		errorEmptyHeader = "Could not detect header. Ensure first row cotains your column headers.",
		separators = [",", ";", "\t"];
	
	function detectSeparator(csv) {
		var counts = {},
			sepMax;
		_.each(separators, function(sep, i) {
			var re = new RegExp(sep, 'g');
			counts[sep] = (csv.match(re) || []).length;
			sepMax = !sepMax || counts[sep] > counts[sepMax] ? sep : sepMax;
		});
		return sepMax ? sepMax : undefined;
	}

	// source: http://stackoverflow.com/a/1293163/2343
    function CSVtoArray( strData, strDelimiter ){
        // Check to see if the delimiter is defined. If not,
        // then default to comma.
        strDelimiter = (strDelimiter || ",");

        // Create a regular expression to parse the CSV values.
        var objPattern = new RegExp(
            (
                // Delimiters.
                "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

                // Quoted fields.
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

                // Standard fields.
                "([^\\" + strDelimiter + "\\r\\n]*))"
            ),
            "gi"
            );


        // Create an array to hold our data. Give the array
        // a default empty first row.
        var arrData = [[]];

        // Create an array to hold our individual pattern
        // matching groups.
        var arrMatches = null;


        // Keep looping over the regular expression matches
        // until we can no longer find a match.
        while (arrMatches = objPattern.exec( strData )){

            // Get the delimiter that was found.
            var strMatchedDelimiter = arrMatches[ 1 ];

            // Check to see if the given delimiter has a length
            // (is not the start of string) and if it matches
            // field delimiter. If id does not, then we know
            // that this delimiter is a row delimiter.
            if (
                strMatchedDelimiter.length &&
                strMatchedDelimiter !== strDelimiter
                ){

                // Since we have reached a new row of data,
                // add an empty row to our data array.
                arrData.push( [] );

            }

            var strMatchedValue;

            // Now that we have our delimiter out of the way,
            // let's check to see which kind of value we
            // captured (quoted or unquoted).
            if (arrMatches[ 2 ]){

                // We found a quoted value. When we capture
                // this value, unescape any double quotes.
                strMatchedValue = arrMatches[ 2 ].replace(
                    new RegExp( "\"\"", "g" ),
                    "\""
                    );

            } else {

                // We found a non-quoted value.
                strMatchedValue = arrMatches[ 3 ];

            }


            // Now that we have our value string, let's add
            // it to the data array.
            arrData[ arrData.length - 1 ].push( strMatchedValue );
        }

        // Return the parsed data.
        return( arrData );
    }
	
	function convert(csv, options) {
		options || (options = {});
		if (csv.length == 0) throw errorEmpty;
		
		var separator = options.separator || detectSeparator(csv);
		if (!separator) throw errorDetectingSeparator;

		var a = CSVtoArray(csv, separator);
		if (!a) throw errorEmpty;

		if (options.transpose) a = _.zip.apply(_, a);

		var keys = a.shift();
		if (keys.length == 0) throw errorEmptyHeader;
		keys = _.map(keys, function(key) {
			return _(key).chain().trim().trim('"').value();
		});
		
		var	json = options.hash ? {} : [];
		for (var l = 0; l < a.length; l++) {
			var row = {},
				hashKey;
			for (var i = 0; i < keys.length; i++) {
				var value = _(a[l][i]).chain().trim().trim('"').value(),
					number = value - 0;
				if (options.hash && i == 0)
					hashKey = value;
				else
					row[keys[i]] = isNaN(number) ? value : number;
			}
			if (options.hash)
				json[hashKey] = row;
			else
				json.push(row);
		}
		
		return json;
	};
	
	this.CSVJSON || (this.CSVJSON = {});
	this.CSVJSON.csv2json = convert;
	
}).call(this);