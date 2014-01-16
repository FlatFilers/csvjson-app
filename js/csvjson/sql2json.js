(function() {
	/**
	 *
	 * CSVJSON.sql2json(sql)
	 *
	 * Converts SQL to JSON. Returns an object. Detects CREATE TABLE and INSERT INTO
	 * statements to extract table header and rows. Use JSON.stringify to conver to a string.
	 *
	 * Dependencies: 
	 *  - underscore (http://underscorejs.org/)
	 *  - underscore.string (https://github.com/epeli/underscore.string)
	 *
	 * Copyright (c) 2014 Martin Drapeau
	 *
	 */
	
	var errorEmpty = "Please upload a file or type in something.";
	
	function convert(sql) {
		if (sql.length == 0) throw errorEmpty;
		
		// Remove comments and empty lines, and collapse statemnts on one line
		sql = sql
				// Remove comments
				.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '$1')
				.replace(/^--.*[\r\n]/gm, "")
				// Remove empty lines
				.replace(/^\s*[\r\n]/gm, "")
				// Collapse statements (TO DO: Convert this to a single regex)
				.replace(/;\s*[\r\n]/gm, ";;")
				.replace(/[\r\n]/gm, "")
				.replace(/;;/gm, ";\n");
		
		var lines = _.lines(sql);
		if (lines.length == 0) throw errorEmpty;
		
		// Split into tables
		var tables = {}, l, line;
		try {
			for (l = 0; l < lines.length; l++) {
				line = lines[l],
					words = _.words(line);
				if (!words.length) continue;
				
				if (words.length >= 3 &&
					words[0].toUpperCase() == 'CREATE' &&
					words[1].toUpperCase() == 'TABLE') {
					var name = _.trim(words[2], "`'\"");
					tables[name] = {
						header: [],
						values: []
					};
					var values = _(line).chain().strRight("(").strLeftBack(")").words(",").value();
					tables[name].header = _.reduce(values, function(result, value) {
						var words = _.words(value);
						if (!words.length)
							throw "Cannot find columns for table " + name;
						var first = _.trim(words[0]);
						if (_.startsWith(first, "'") || _.startsWith(first, "`") || _.startsWith(first, '"'))
							result.push(_.trim(first, "`'\""));
						return result;
					}, []);
					if (!tables[name].header.length)
						throw "No columns found for table " + name;
				}
				else if (words.length >= 3 &&
					words[0].toUpperCase() == 'INSERT' &&
					words[1].toUpperCase() == 'INTO') {
					var name = _.trim(words[2], "`'\"");
					if (!tables[name])
						throw "Table "+name+" was not defined in a CREATE TABLE.";
					var table = tables[name];
					var values = _(line).chain().strRight("(").strLeftBack(")").words(",").value();
					if (!values.length)
						throw "No values found for table " + name;
					tables[name].values.push(_.map(values, function(value) {
						return _.trim(value, " `'\"");
					}));
				}
			}
		} catch(error) {
			throw "Error: " + error + "\n..." + line;
		}
		
		// Convert to objects now
		var	objects = {};
		_.each(tables, function(table, name) {
			var keys = table.header;
			objects[name] = _.map(table.values, function(values) {
				var o = {};
				for (var k=0; k < keys.length; k++)
					o[keys[k]] = values[k];
				return o;
			});
		});
		
		return objects;
	}
	
	this.CSVJSON || (this.CSVJSON = {});
	this.CSVJSON.sql2json = convert;
	
}).call(this);