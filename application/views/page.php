<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<link href="/img/favicon.ico" rel="shortcut icon" type="image/x-icon">
		
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		
		<title><?=$title?></title>
		<meta name="description" content="<?=$description?>">
		
		<script type="text/javascript">
			window.CSVJSON = {
				page: '<?=$page?>',
				version: <?=VERSION?>
			};
		</script>
		
		<script src="/js/jquery-2.0.3.min.js" type="text/javascript"></script>
		<script src="/js/3rd/bootstrap/js/bootstrap.min.js" type="text/javascript"></script>
		
		<link href="/js/3rd/bootstrap/css/bootstrap.css" rel="stylesheet" type="text/css" charset="utf-8" />
		<link href="/js/3rd/jQuery-File-Upload/css/jquery.fileupload.css" rel="stylesheet" type="text/css" charset="utf-8" />
		
		<?php $this->load->view('assets'); ?>
	</head>
	<body>
		<header class="navbar navbar-inverse" role="banner">
			<div class="container">
				<div class="navbar-header">
					<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
						<span class="sr-only">Toggle navigation</span>
						<span class="icon-bar"></span>
						<span class="icon-bar"></span>
						<span class="icon-bar"></span>
					</button>
					<a class="navbar-brand" href="/" title="csvjson.com - Conversion tools">
						<i class="glyphicon glyphicon-chevron-right"></i>
					</a>
				</div>
				<div class="collapse navbar-collapse" id="navbar-collapse">
					<ul class="nav navbar-nav navbar-left">
						<li class="<?=$page == 'csv2json' ? 'active' : ''?>"><a href="/csv2json">CSV to JSON</a></li>
						<li class="<?=$page == 'json_beautifier' ? 'active' : ''?>"><a href="/json_beautifier">JSON Beautifier</a></li>
					</ul>
				</div>
			</div>
		</header>

		<?php $this->load->view($view); ?>
		
		<footer class="navbar">
			<div class="container">
				<p class="pull-left">&copy; 2014 <a href="https://github.com/martindrapeau">Martin Drapeau</a></p>
				<p class="pull-right"><a href="https://github.com/martindrapeau/CSVJSON">Fork me on Github</a></p>
			</div>
		</footer>
	</body>
</html>