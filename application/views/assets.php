<?php foreach ($this->config->item('assets') as $bundle): ?>
	<?php if (ENVIRONMENT == 'production'): ?>
		<?php if ($bundle['type'] == JAVASCRIPT): ?>
			<script src="/<?=$bundle['output']?>?v=<?=VERSION?>" type="text/javascript"></script>
		<?php elseif ($bundle['type'] == CSS): ?>
			<link href="/<?=$bundle['output']?>?v=<?=VERSION?>" rel="stylesheet" type="text/css" charset="utf-8" />
		<?php endif; ?>
	<?php else: ?>
		<?php foreach ($bundle['files'] as $file): ?>
			<?php if ($bundle['type'] == JAVASCRIPT): ?>
				<script src="/<?=$file?>" type="text/javascript"></script>
			<?php elseif ($bundle['type'] == CSS): ?>
				<link href="/<?=$file?>" rel="stylesheet" type="text/css" charset="utf-8" />
			<?php endif; ?>
		<?php endforeach; ?>
	<?php endif; ?>
<?php endforeach; ?>