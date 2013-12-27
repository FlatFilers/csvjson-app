<?php foreach ($this->config->item('css_assets') as $minFile => $files): ?>
	<?php if (ENVIRONMENT == 'production'): ?>
		<link href="/<?=$minFile?>?v=<?=VERSION?>" rel="stylesheet" type="text/css" charset="utf-8" />
	<?php else: ?>
		<?php foreach ($files as $file): ?>
			<link href="/<?=$file?>" rel="stylesheet" type="text/css" charset="utf-8" />
		<?php endforeach; ?>
	<?php endif; ?>
<?php endforeach; ?>