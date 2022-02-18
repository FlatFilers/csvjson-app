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
				data_url: <?=$data_url ? '"'.$data_url.'"' : 'null'?>
			};
		</script>

		<script src="//cdnjs.cloudflare.com/ajax/libs/jquery/2.0.3/jquery.min.js" type="text/javascript"></script>
		<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css">
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
		<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>

		<link href="/js/3rd/jQuery-File-Upload/css/jquery.fileupload.css" rel="stylesheet" type="text/css" charset="utf-8" />
		<link rel="stylesheet" href="https://use.typekit.net/kqm0crs.css">

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

		<?php
			//background color of menu
			function dark_light($page){
				echo ($page == 'home') ? 'bg-dark' : 'bg-light';
			}
		?>

		<?php
			//active menu
			function active($current_page, $page){
				if($current_page == $page){
						echo 'active';
				}
			}
		?>

		<script>
			!function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on"];analytics.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);analytics.push(e);return analytics}};for(var t=0;t<analytics.methods.length;t++){var e=analytics.methods[t];analytics[e]=analytics.factory(e)}analytics.load=function(t,e){var n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src="https://cdn.segment.com/analytics.js/v1/"+t+"/analytics.min.js";var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(n,a);analytics._loadOptions=e};analytics.SNIPPET_VERSION="4.1.0";
				analytics.load("mVmXAtABgYVqPdbXw1a4Y19vcesa1cec");
				analytics.page();
			}}();

			analytics.ready(function(){
				var flatfileLinks = $('a[href*="flatfile.com"]');

				flatfileLinks.each(function(){
					var bareURL = $(this).attr('href')
					$(this).attr('href', bareURL + '&ajs_event=came_from_csvjson&ajs_prop_ccf_id=' + window.analytics.user().anonymousId())
				})

				analytics.trackLink(flatfileLinks, 'Clicked Flatfile Link');
			})
	</script>
	</head>
	<body>
		<header class="px-4 py-4 border-bottom <?php dark_light($page);?>">
	    <div class="container d-flex flex-wrap justify-content-left pt-2 pb-2">
					<div class="dropdown d-flex align-items-center me-lg-auto text-decoration-none">
								<a href="#" class="d-flex align-items-center me-lg-auto text-decoration-none dropdown-toggle" id="dropdownNavLink" data-bs-toggle="dropdown" aria-expanded="false">
									<img src="img/logo_<?php dark_light($page);?>.svg" width="140">
								</a>
								<ul class="dropdown-menu text-small shadow" aria-labelledby="dropdownNavLink" style="">
									<li><a class="dropdown-item <?php active('home',$page);?>" href="/">Home</a></li>
									<li><a class="dropdown-item <?php active('csv2json', $page);?>" href="/csv2json">CSV to JSON</a></li>
									<li><a class="dropdown-item <?php active('json2csv', $page);?>" href="/json2csv">JSON to CSV</a></li>
									<li><a class="dropdown-item <?php active('sql2json', $page);?>" href="/sql2json">SQL to JSON</a></li>
									<li><a class="dropdown-item <?php active('csvjson2json', $page);?>" href="/csvjson2json">CSVJSON to JSON</a></li>
									<li><hr class="dropdown-divider"></li>
									<li><a class="dropdown-item <?php active('json_validator', $page);?>" href="/json_validator">JSON Validator</a></li>
									<li><a class="dropdown-item <?php active('json_beautifier', $page);?>" href="/json_beautifier">JSON Beautifier</a></li>
									<!--<li><a class="dropdown-item" href="/datajanitor">Data Janitor</a></li>-->
									<li><hr class="dropdown-divider"></li>
									<li><a class="dropdown-item" href="https://flatfile.com/get-started?utm_source=csvjso&nutm_medium=csvjson_menu&utm_campaign=q1-2022-csvjson-redesign">Upgrade to Flatfile</a></li>
								</ul>
							</div>

							<a class="btn d-none d-sm-block" href="https://flatfile.com/get-started?utm_source=csvjson&utm_medium=csvjson_header&utm_campaign=q1-2022-csvjson-redesign">
								<img src="img/flatfile-jewel.svg" width="20" style="margin:-2px 5px 0 0px"/>
								<b>Turnkey CSV Importer</b> &bull; <small>Installs in minutes</small>
							</a>
			</div>
  	</header>
		<?php if ($page !== 'home'): ?>
			<header class="px-4 border-bottom">
				<div class="container d-flex flex-wrap justify-content-left pt-3 pb-1">
					<div class="row">
						<div class="col-md-12">
							<nav aria-label="breadcrumb">
								<ol class="breadcrumb">
									<li class="breadcrumb-item"><a href="/">Home</a></li>
									<li class="breadcrumb-item active" aria-current="page"><?=$page?></li>
								</ol>
							</nav>
						</div>
					</div>
				</div>
			</header>
		<?php endif; ?>

		<?php $this->load->view($view); ?>

		<footer class="bd-footer px-3 py-5 mt-5 bg-light">
  		<div class="container py-5">
    <div class="row">
      <div class="col-lg-3 mb-3">
        <a class="d-inline-flex align-items-center mb-2 link-dark text-decoration-none" href="/" aria-label="Bootstrap">
					<img src="./img/logo_bg-light.svg" width="140">
        </a>
        <ul class="list-unstyled small text-muted">
          <li class="mb-2">Rage designed and built with love by the <a href="https://flatfile.com/get-started?utm_source=csvjson&utm_medium=csvjson_footer&utm_campaign=q1-2022-csvjson-redesign">Flatfile team</a> with the help of <a href="https://github.com/FlatFilers/csvjson-app/graphs/contributors">our contributors</a>.</li>
        </ul>
      </div>
      <div class="col-sm-6 col-xs-12 col-lg-3 mb-3">
        <h5>Convert</h5>
        <ul class="list-unstyled">
          <li class="mb-2"><a href="/csv2json">CSV to JSON</a></li>
          <li class="mb-2"><a href="/json2csv">JSON to CSV</a></li>
					<li class="mb-2"><a href="/sql2json">SQL to JSON</a></li>
					<li class="mb-2"><a href="/csvjson2json">CSVJSON to JSON</a></li>
        </ul>
      </div>
			<div class="col-sm-6 col-xs-12 col-lg-3 mb-3">
        <h5>Validate & Transform</h5>
        <ul class="list-unstyled">
          <li class="mb-2"><a href="/json_validator">JSON Validator</a></li>
          <li class="mb-2"><a href="/json_beautifier">JSON Beautifier</a></li>
					<!--<li class="mb-2"><a href="/datajanitor">Data Janitor</a></li>-->
				</ul>
      </div>
      <div class="col-xs-12 col-sm-6 col-lg-3 mb-3">
        <h5>Community</h5>
        <ul class="list-unstyled">
					<li class="mb-2"><a href="https://github.com/FlatFilers/csvjson-app/">Github</a></li>
					<li class="mb-2"><a href="https://github.com/FlatFilers/csvjson-app/issues?q=is%3Aissue+is%3Aclosed">Change Log</a></li>
          <li class="mb-2"><a href="https://github.com/FlatFilers/csvjson-app/issues/new">Issues</a></li>
          <li class="mb-2"><a href="https://github.com/FlatFilers/csvjson-app#readme">Docs</a></li>
          <li class="mb-2"><a href="https://flatfile.com/get-started?utm_source=csvjson&utm_medium=csvjson_footer&utm_campaign=q1-2022-csvjson-redesign">Corporate sponsor</a></li>
        </ul>
      </div>
    </div>
  </div>
		</footer>
	</body>
</html>
