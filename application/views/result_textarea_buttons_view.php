<div class="mb-3">
  <label class="form-label"><?=$result_title?></label> <span class="result-note"></span>
  <textarea id="result" class="form-control result save" rows="18" spellcheck="false"></textarea>
</div>
<a id="download" class="btn btn-primary mb-2 me-2" href="" download="<?=$download?>" disabled="disabled" target="_self">
  <i class="bi bi-cloud-download"></i> Download
</a>
<?php if ($showSave): ?>
      <a href="#" class="btn btn-primary mb-2 me-2 save-permalink" title="Save a permanent link to share with a colleague."><i class="bi bi-save"></i> Save</a>
<?php endif; ?>
<a id="copy" class="btn btn-light mb-2 me-2" href="#" title="or Ctrl + A then Ctrl + C to copy to clipboard."><i class="bi bi-share"></i> Copy to clipboard</a>
