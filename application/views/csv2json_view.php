<div class="container">
	<div class="row">
		<div class="description col-md-12">
			<p>Convert your CSV formatted data to JSON.</p>
		</div>
	</div>
	
	<div class="row">
		<div class="col-md-5 more-bottom-margin">
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
				<?php $default = "a,b,c\n1,2,3"; ?>
				<textarea id="csv" class="form-control input save" rows="15"><?=$default?></textarea>
			</div>
			<button id="convert" type="submit" class="btn btn-primary">
				<i class="glyphicon glyphicon-chevron-right"></i> Convert
			</button>
		</div>
		
		<div class="col-md-7 more-bottom-margin">
			<div class="form-group">
				<label>Field separator</label>
				<div class="form-control options">
					<label class="radio-inline"><input type="radio" id="auto-detect" name="separator" class="save" value="auto" />Auto-detect</label>
					<label class="radio-inline"><input type="radio" id="comma" name="separator" class="save" value="comma" />Comma</label>
					<label class="radio-inline"><input type="radio" id="semi-colon" name="separator" class="save" value="semiColon" />Semi-colon</label>
					<label class="radio-inline"><input type="radio" id="tab" name="separator" class="save" value="tab" />Tab</label>
				</div>
			</div>
			<div class="form-group code-group">
				<label>JSON</label>
				<textarea id="json" class="form-control result save" rows="15"></textarea>
			</div>
			<p class="help-block">Ctrl + A then Ctrl + C to copy to clipboard.</p>
			<a class="convert" href="#" title="Convert"><i class="glyphicon glyphicon-chevron-right"></i></a>
			<a class="clear" href="#" title="Clear"><i class="glyphicon glyphicon-remove"></i></a>
		</div>
	</div>
</div>