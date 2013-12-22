$(document).ready(function() {
	// Load Underscore String
	_.mixin(_.str.exports());
	
	// Load the appropriate page module
	var fn = CSVJSON[CSVJSON.page];
	if (typeof(fn) !== 'function') throw "Module "+CSVJSON.page+" not found.";
	CSVJSON[CSVJSON.page]();
});