<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<link href="/img/favicon.ico" rel="shortcut icon" type="image/x-icon">
		
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		
		<title>CSV to JSON</title>
		
		<script src="/js/jquery-2.0.3.min.js" type="text/javascript"></script>
		<script src="/js/json/json2.js" type="text/javascript"></script>
		<script src="/js/jQuery-File-Upload/js/vendor/jquery.ui.widget.js"></script>
		<script src="/js/jQuery-File-Upload/js/jquery.iframe-transport.js"></script>
		<script src="/js/jQuery-File-Upload/js/jquery.fileupload.js"></script>
		<link href="/js/jQuery-File-Upload/css/jquery.fileupload.css" rel="stylesheet" type="text/css" charset="utf-8" />
		<script src="/js/underscore-min.js"></script>
		<script src="/js/underscore.string.min.js"></script>
		
		<script src="/js/bootstrap/js/bootstrap.min.js"></script>
		<link href="/js/bootstrap/css/bootstrap.css" rel="stylesheet" type="text/css" charset="utf-8" />
		
		<link href="/css/csvjson.css" rel="stylesheet" type="text/css" charset="utf-8" />
		
		<script src="/js/csv2json.js"></script>
		
	</head>
	<body>
		<nav class="navbar navbar-inverse" role="navigation">
			<div class="navbar-header">
				<button type="button" class="navbar-toggle" data-toggle="collapse" data-target="navbar-collapse">
					<span class="sr-only">Toggle navigation</span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
				</button>
				<a class="navbar-brand" href="/">CSVJSON</a>
			</div>
			<div class="collapse navbar-collapse" id="navbar-collapse">
				<ul class="nav navbar-nav">
					<li class="active"><a>CSV to JSON</a></li>
					<li><a href="/json-validator">JSON Validator</a></li>
				</ul>
				<ul class="nav navbar-nav navbar-right">
					<li><a href="/about">About</a></li>
				</ul>
			</div>
		</nav>
		<div class="container">
			<div class="row">
				<div class="header col-md-12">
					<p>Convert your CSV formatted data to JSON.</p>
				</div>
			</div>
			
			<div class="row">
				<div class="csv col-md-6">
					<div class="form-group">
						<label>Upload a file</label>
						<span class="btn btn-default fileinput-button form-control">
							<label>
								<i class="glyphicon glyphicon-plus"></i>
								<span>Select a file...</span>
							</label>
							<input id="fileupload" type="file" name="file" />
						</span>
					</div>
					<div class="form-group code-group">
						<label>Or paste your CSV here</label>
						<textarea id="csv" class="form-control"><?="a,b,c\n1,2,3"?></textarea>
						<a class="clear" href="#" title="Clear"><i class="glyphicon glyphicon-remove"></i></a>
					</div>
					<button id="convert" type="submit" class="btn btn-primary">Convert</button>
				</div>
				
				<div class="json col-md-6">
					<div class="form-group">
						<label>Field separator</label>
						<div class="form-control">
							<label class="radio-inline"><input type="radio" id="auto-detect" name="separator" value="auto" checked="checked" />Auto-detect</label>
							<label class="radio-inline"><input type="radio" id="comma" name="separator" value="comma" />Comma</label>
							<label class="radio-inline"><input type="radio" id="semi-colon" name="separator" value="semiColon" />Semi-colon</label>
							<label class="radio-inline"><input type="radio" id="tab" name="separator" value="tab" />Tab</label>
						</div>
					</div>
					<div class="form-group code-group">
						<label>JSON</label>
						<textarea id="json" class="form-control"></textarea>
						<a class="clear" href="#" title="Clear"><i class="glyphicon glyphicon-remove"></i></a>
					</div>
					<p class="help-block">Ctrl + A then Ctrl + C to copy to clipboard.</p>
				</div>
			</div>
		</div>
	</body>
</html>