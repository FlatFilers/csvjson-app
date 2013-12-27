<?php foreach ($this->config->item('js_assets') as $minFile => $files): ?>
	<?php if (ENVIRONMENT == 'production'): ?>
		<script src="/<?=$minFile?>?v=<?=VERSION?>" type="text/javascript"></script>
	<?php else: ?>
		<?php foreach ($files as $file): ?>
			<script src="/<?=$file?>" type="text/javascript"></script>
		<?php endforeach; ?>
	<?php endif; ?>
<?php endforeach; ?>