<div class="container-fluid">
	<div class="row">
		<div class="col-md-2 col-sm-3">
			<ul class="nav nav-pills nav-stacked" role="tablist">
				<li role="presentation"><a href="/datajanitor">Data Janitor</a></li>
				<?php foreach($subViews as $key => $value): ?>
					<li role="presentation" class="<?=$subView == $key ? 'active' : ''?>"><a href="/datajanitor/docs/<?=$key?>"><?=$value?></a></li>
					<?php if ($key == 'tips'): ?>
						<li role="presentation" class="disabled"><a href="#">Examples</a></li>
					<?php endif; ?>
				<?php endforeach; ?>
			</ul>
		</div>
		<div class="col-md-10 col-sm-9">
			<?php $this->load->view('datajanitor/'.$subView.'_view'); ?>
		</div>
	</div>
</div>