<div class="form-group code-group">
  <label><?=$result_title?></label> <span class="result-note"></span>
  <textarea id="result" class="form-control result save" rows="18" spellcheck="false"></textarea>
</div>
<a id="download" class="btn btn-primary" href="" download="<?=$download?>" disabled="disabled" target="_self">
  <i class="glyphicon glyphicon-download"></i> Download
</a>
<a id="copy" class="btn btn-primary" href="#" title="or Ctrl + A then Ctrl + C to copy to clipboard."><i class="glyphicon glyphicon-share"></i> Copy</a>
<a class="convert" href="#" title="Convert"><i class="glyphicon glyphicon-chevron-right"></i></a>
<a class="clear" href="#" title="Clear"><i class="glyphicon glyphicon-remove"></i></a>
<br/>
<a id="issue" class="btn btn-default" href="#" tabindex="0" role="button" data-toggle="popover" title= "Found an issue? Want an improvement?">Bug or suggestion?</a>