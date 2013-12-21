<div class="container">
	<div class="row">
		<div class="description col-md-12">
			<p>Validate your JSON.</p>
		</div>
	</div>
	
	<div class="row">
		<div class="col-md-6 more-bottom-margin">
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
				<label>Or paste your JSON here</label>
				<textarea id="csv" class="form-control" rows="15"><?="a,b,c\n1,2,3"?></textarea>
				<a class="clear" href="#" title="Clear"><i class="glyphicon glyphicon-remove"></i></a>
			</div>
			<button id="convert" type="submit" class="btn btn-primary">Validate</button>
		</div>
		
		<div class="col-md-6 more-bottom-margin">
			<div class="form-group">
				<label>Options</label>
				<div class="form-control">
				</div>
			</div>
			<div class="form-group code-group">
				<label>Result</label>
				<textarea id="result" class="form-control" rows="15"></textarea>
			</div>
		</div>
	</div>
</div>