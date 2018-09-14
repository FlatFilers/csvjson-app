<!DOCTYPE html>
<html lang="en">
	<head>
    <meta http-equiv="Content-Security-Policy" content="default-src * filesystem: data: gap: http://www.google-analytics.com http://www.googletagmanager.com http://ssl.gstatic.com http://www.csvjson.com http://csvjson.s3.amazonaws.com http://csvjson.s3.us-east-2.amazonaws.com http://www.csvjson.com 'unsafe-eval' 'unsafe-inline'; media-src *; img-src * data:">
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<link href="/img/favicon.ico" rel="shortcut icon" type="image/x-icon">
		
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		
		<title><?=$title?> - CSVJSON</title>
		<meta name="description" content="<?=$description?>">
		
		<script type="text/javascript">
			window.APP = {
				page: "<?=$page?>",
				version: <?=VERSION?>,
				id: <?=$id ? '"'.$id.'"' : 'null'?>,
				data: <?=$data ? $data : 'null'?>,
				data_url: <?=$data_url ? '"'.$data_url.'"' : 'null'?>
			};
		</script>
		
		<script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js" type="text/javascript"></script>
		<script src="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js" type="text/javascript"></script>
		
		<link href="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet" type="text/css" charset="utf-8" />
		<link href="/js/3rd/jQuery-File-Upload/css/jquery.fileupload.css" rel="stylesheet" type="text/css" charset="utf-8" />

		<?php if ($page == 'json_validator'): ?>
			<script src="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/codemirror.min.js" type="text/javascript"></script>
			<script src="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/mode/javascript/javascript.min.js" type="text/javascript"></script>
			<script src="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/addon/lint/lint.min.js" type="text/javascript"></script>
			<script src="//cdnjs.cloudflare.com/ajax/libs/jshint/2.9.5/jshint.min.js" type="text/javascript"></script>
			<script src="/js/3rd/codemirror/jsonlint.js" type="text/javascript"></script>
			<script src="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/addon/lint/json-lint.min.js" type="text/javascript"></script>
			<link href="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/codemirror.min.css" rel="stylesheet" type="text/css" charset="utf-8" />
			<link href="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/addon/lint/lint.min.css" rel="stylesheet" type="text/css" charset="utf-8" />
		<?php endif; ?>
		
		<?php $this->load->view('assets'); ?>
		
		<script>
		  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
		  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
		  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
		  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
		  ga('create', 'UA-46942708-1', 'auto');
		  ga('send', 'pageview');
		</script>
	</head>
	<body>
		<header class="navbar navbar-inverse" role="banner">
			<div class="container-fluid">
				<div class="navbar-header">
					<a class="navbar-brand" href="/" title="csvjson.com - Online Conversion Tools">
						<img src="/img/logo-text.png" alt="> CSVJSON" />
					</a>
					<ul class="nav navbar-nav navbar-left">
						<li class="active"><a href="/<?=$page?>"><?=$title?></a></li>
					</ul>
					<?php if ($page != 'home'): ?>
						<ul class="nav navbar-nav navbar-right">
							<li><a href="#" class="save-permalink" title="Save a permanent link to come back later, or to share with a friend."><i class="glyphicon glyphicon-link"></i> Save</a></li>
						</ul>
					<?php endif; ?>
					<ul class="nav navbar-nav navbar-left">
						<li><a class="navbar-toggle-no-style" data-toggle="collapse" data-target=".navbar-collapse">More <span class="caret"></span></a></li>
					</ul>
				</div>
				<div class="collapse navbar-collapse" id="navbar-collapse">
					<ul class="nav navbar-nav navbar-left">
						<li class="<?=$page == 'csv2json' ? 'active' : ''?>"><a href="/csv2json">CSV to JSON</a></li>
						<li class="<?=$page == 'json2csv' ? 'active' : ''?>"><a href="/json2csv">JSON to CSV</a></li>
						<li class="<?=$page == 'json_beautifier' ? 'active' : ''?>"><a href="/json_beautifier">JSON Beautifier</a></li>
						<li class="<?=$page == 'json_validator' ? 'active' : ''?>"><a href="/json_validator">JSON Validator</a></li>
						<li class="<?=$page == 'sql2json' ? 'active' : ''?>"><a href="/sql2json">SQL to JSON</a></li>
						<li class="<?=$page == 'csvjson2json' ? 'active' : ''?>"><a href="/csvjson2json">CSVJSON to JSON</a></li>
					</ul>
					<?php if ($page != 'home'): ?>
						<ul class="nav navbar-nav navbar-right">
							<li><a href="#" class="save-permalink" title="Save a permanent link to come back later, or to share with a friend."><i class="glyphicon glyphicon-link"></i> Save</a></li>
						</ul>
					<?php endif; ?>
				</div>
			</div>
		</header>

		<?php $this->load->view($view); ?>
		
		<footer class="navbar">
			<div class="container-fluid">
				<p>
					&copy; 2014-2018 <a href="http://martindrapeau.tumblr.com/">Martin Drapeau</a> &nbsp;
					<a href="https://github.com/martindrapeau/csvjson-app/issues">Report an issue</a> &nbsp;
					<a href="https://github.com/martindrapeau/csvjson-app">Code available on Github</a>
				</p>
			</div>
		</footer>
	</body>
</html>