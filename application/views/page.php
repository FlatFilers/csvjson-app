<!DOCTYPE html>
<html lang="en">
	<head>
    <meta http-equiv="Content-Security-Policy" content="default-src * filesystem: data: gap: http://www.google-analytics.com http://www.googletagmanager.com http://ssl.gstatic.com http://csvjson.s3.amazonaws.com http://csvjson.s3.us-east-2.amazonaws.com 'unsafe-eval' 'unsafe-inline'; media-src *; img-src * data:">
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<link href="/img/favicon.ico" rel="shortcut icon" type="image/x-icon">

		<meta name="viewport" content="width=device-width, initial-scale=1.0">

		<title><?=$title?> - CSVJSON</title>
		<meta name="description" content="<?=$description?>">

		<script type="text/javascript">
			window.APP = {
				page: "<?=$page?>",
				run: <?=$run ? 'true' : 'false'?>,
				version: <?=VERSION?>,
				id: <?=$id ? '"'.$id.'"' : 'null'?>,
				data: <?=$data ? $data : 'null'?>,
				data_url: <?=$data_url ? '"'.$data_url.'"' : 'null'?>,
				captureOutboundLink: function(event) {
					var url = event.currentTarget.getAttribute('href');
					tracker = ga.getAll()[0];
					tracker.send('event', 'outbound', 'click', url, {
						'transport': 'beacon',
						'hitCallback': function(){document.location = url;}
					});
				}
			};
		</script>

		<script src="//cdnjs.cloudflare.com/ajax/libs/jquery/2.0.3/jquery.min.js" type="text/javascript"></script>
		<script src="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js" type="text/javascript"></script>
		<link href="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet" type="text/css" charset="utf-8" />
		<link href="/js/3rd/jQuery-File-Upload/css/jquery.fileupload.css" rel="stylesheet" type="text/css" charset="utf-8" />

		<?php if ($page == 'json_validator' || $page == 'datajanitor'): ?>
			<script src="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/codemirror.min.js" type="text/javascript"></script>
			<script src="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/mode/javascript/javascript.min.js" type="text/javascript"></script>
			<script src="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/addon/lint/lint.min.js" type="text/javascript"></script>
			<script src="//cdnjs.cloudflare.com/ajax/libs/jshint/2.9.5/jshint.min.js" type="text/javascript"></script>
			<script src="/js/3rd/codemirror/jsonlint.js" type="text/javascript"></script>
			<script src="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/addon/lint/javascript-lint.min.js" type="text/javascript"></script>
			<script src="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/addon/lint/json-lint.min.js" type="text/javascript"></script>
			<link href="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/codemirror.min.css" rel="stylesheet" type="text/css" charset="utf-8" />
			<link href="//cdnjs.cloudflare.com/ajax/libs/codemirror/5.40.0/addon/lint/lint.min.css" rel="stylesheet" type="text/css" charset="utf-8" />
		<?php endif; ?>

		<?php $this->load->view('assets'); ?>

		<script>
			!function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on"];analytics.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);analytics.push(e);return analytics}};for(var t=0;t<analytics.methods.length;t++){var e=analytics.methods[t];analytics[e]=analytics.factory(e)}analytics.load=function(t,e){var n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src="https://cdn.segment.com/analytics.js/v1/"+t+"/analytics.min.js";var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(n,a);analytics._loadOptions=e};analytics.SNIPPET_VERSION="4.1.0";
				analytics.load("mVmXAtABgYVqPdbXw1a4Y19vcesa1cec");
				analytics.page();
			}}();
	</script>
	</head>
	<body>
		<header class="navbar" role="banner">
			<div class="container-fluid">
				<div class="navbar-header">
					<a class="navbar-brand" href="/" title="csvjson.com - Online Conversion Tools, sponsored by Flatfile">
						<img src="/img/logo-sponsor-flatfile.svg" alt="> CSVJSON sponsored by Flatfile" />
					</a>
					<ul class="nav navbar-nav navbar-left">
						<?php if ($page != 'home'): ?>
							<li class="active">
								<a href="/<?=$page?>"><?=$tool?><?=$beta ? ' <sup>BETA</sup>' : ''?></a>
							</li>
						<?php endif; ?>
						<li class="dropdown">
							<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Tools <span class="caret"></span></a>
							<ul class="dropdown-menu">
								<li><a href="/csv2json">CSV to JSON</a></li>
								<li><a href="/json2csv">JSON to CSV</a></li>
								<li><a href="/json_beautifier">JSON Beautifier</a></li>
								<li><a href="/json_validator">JSON Validator</a></li>
								<li><a href="/sql2json">SQL to JSON</a></li>
								<li><a href="/csvjson2json">CSVJSON to JSON</a></li>
								<li><a href="/datajanitor">Data Janitor <sup>BETA</sup></a></li>
							</ul>
						</li>
					</ul>
					<ul class="nav navbar-nav navbar-right flatfile-banner">
						<li>
							<a href="<?=$page == 'csv2json' ? 'https://try.flatfile.io/csv-importer-for-web-apps?utm_source=CSVJSON-Sponsorship-November-2019&utm_medium=Banner-Promo&utm_campaign=CSVJSON-Sponsorship-Q4-2019-Converter-Page-Top-Banner&utm_term=Converter-Page-Top-Right-Banner&utm_content=CSV-Importer' : 'https://try.flatfile.io/csv-importer-for-web-apps?utm_source=CSVJSON-Sponsorship-November-2019&utm_medium=Banner-Promo&utm_campaign=CSVJSON-Sponsorship-Q4-2019-Home-Top-Right-Banner-Promo&utm_term=Home-Top-Right-Banner&utm_content=CSV-Importer'?>"
								title="The seamless way to import, clean, & consolidate customer data" onclick="APP.captureOutboundLink(event)">
								<span class="image-wrapper">
									<img src="/img/flatfile-logomark.svg" alt="Flatfile logo" />
								</span>
								<span class="text">
									<span class="text-row">
										<strong>CSV Importer</strong> • <span class="secondary">Install in minutes</span>
									</span>
									<span class="text-row">
										Works with React, Angular, Vue and more...
									</span>
								<span>
							</a>
						</li>
					</ul>
					<?php if ($showSave): ?>
						<ul class="nav navbar-nav navbar-right">
							<li>
								<a href="#" class="save-permalink" title="Save a permanent link to share with a colleague."><i class="glyphicon glyphicon-link"></i> Save</a>
							</li>
						</ul>
					<?php endif; ?>
				</div>
			</div>
		</header>

		<?php $this->load->view($view); ?>

		<footer class="navbar">
			<div class="container-fluid">
				<p>
					&copy; 2014-2019 <a href="https://medium.com/@martindrapeau">Martin Drapeau</a> &nbsp;
					<a href="https://github.com/martindrapeau/csvjson-app/issues">Report an issue</a> &nbsp;
					<a href="https://github.com/martindrapeau/csvjson-app">Code available on GitHub</a>
				</p>
			</div>
		</footer>
	</body>
</html>
