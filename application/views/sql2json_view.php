<div class="container-fluid">
	<div class="row">
		<div class="description col-md-12">
			<h1 class="discrete">Convert your SQL table or database export to JSON or Javascript.</h1>
			<p>1) Copy/paste or upload your SQL export to convert it. 2) Convert to JSON or Javascript (one variable is created per table). 3) Copy and paste back to your computer. 4) Save your result for later or for sharing.</p>
		</div>
	</div>
	
	<div class="row">
		<div class="col-md-5 more-bottom-margin">
			<div class="form-group">
				<label>Upload a SQL file</label>
				<span class="btn btn-default fileinput-button form-control">
					<label>
						<i class="glyphicon glyphicon-plus"></i>
						<span>Select a file...</span>
					</label>
					<input id="fileupload" type="file" name="file" />
				</span>
			</div>
			<div class="form-group code-group">
				<label>Or paste your SQL here</label>
<textarea id="sql" class="form-control input save" rows="18">
/**
 * Continents 
 */
SET FOREIGN_KEY_CHECKS=0;
 
-- ----------------------------
-- Table structure for `continents`
-- ----------------------------
DROP TABLE IF EXISTS `continents`;
CREATE TABLE `continents` (
  `code` char(2) NOT NULL COMMENT 'Continent code',
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;
 
-- ----------------------------
-- Records of continents
-- ----------------------------
INSERT INTO `continents` VALUES ('AF', 'Africa');
INSERT INTO `continents` VALUES ('AN', 'Antarctica');
INSERT INTO `continents` VALUES ('AS', 'Asia');
INSERT INTO `continents` VALUES ('EU', 'Europe');
INSERT INTO `continents` VALUES ('NA', 'North America');
INSERT INTO `continents` VALUES ('OC', 'Oceania');
INSERT INTO `continents` VALUES ('SA', 'South America');
INSERT INTO `continents` VALUES ('??', NULL);
</textarea>
			</div>
			<button id="convert" type="submit" class="btn btn-primary">
				<i class="glyphicon glyphicon-chevron-right"></i> Convert
			</button>
			<button id="clear" type="submit" class="btn">
				<i class="glyphicon glyphicon-remove"></i> Clear
			</button>
		</div>
		
		<div class="col-md-7 more-bottom-margin">
			<div class="form-group">
				<label>Output format</label>
				<div class="form-control options">
					<label class="radio-inline"><input type="radio" id="json" name="format" class="save" value="json" checked="checked" />JSON</label>
					<label class="radio-inline"><input type="radio" id="javascript" name="format" class="save" value="javascript" />Javascript</label>
					&nbsp;
					<label class="inline" title="Minify or compact result by removing spaces and new lines.">
						<input type="checkbox" id="minify" name="minify" class="save" /> Minify
					</label>
				</div>
			</div>
			<?php $this->load->view('result_textarea_buttons_view', array('result_title' => 'Result', 'download' => 'csvjson.json')); ?>
		</div>
	</div>
	<br/>
	<div class="row">
		<div class="col-md-8 about">
			<h4>About SQL to JSON</h4>
			<ul>
				<li>Works by detecting <code>CREATE TABLE</code> and <code>INSERT INTO</code> statements, in order to create an object representation of the tables.</li>
			</ul>
			<h4>Change Log</h4>
			<ul>
				<li><strong>Jan 8, 2018</strong> Support escaped quotes: <a href="https://github.com/martindrapeau/csvjson-app/issues/26">GitHub issue #26</a>. Thank you <a href="https://github.com/lbottoni" target="_blank">lbottoni</a> for reporting.</li>
				<li><strong>Dec 18, 2017</strong> Bug fix: Convert a <code>NULL</code> value to <code>null</code>.</li>
				<li><strong>Dec 18, 2017</strong> Improvement: Added option to minify or compact JSON. <a href="https://github.com/martindrapeau/csvjson-app/issues/21">GitHub issue #21</a></li>
				<li><strong>Dec 13, 2017</strong> Parsing bug fix not to split when detecting a comma in a string value: GitHub Issues <a href="https://github.com/martindrapeau/csvjson-app/issues/17" target="_blank">#17</a> and <a href="https://github.com/martindrapeau/csvjson-app/issues/25" target="_blank">#25</a>. Thank you <a href="https://github.com/Idafe" target="_blank">Idafe</a> and <a href="https://github.com/jdserato" target="_blank">Jay Vince Serato</a> for reporting the issue.</li>
				<li><strong>Sep 4, 2017</strong> Parsing bug fix: <a href="https://github.com/martindrapeau/csvjson-app/issues/22" target="_blank">GitHub Issue #22</a>.</li>
				<li><strong>Sep 29, 2016</strong> Bug fix <a href="https://github.com/martindrapeau/csvjson-app/issues/11" target="_blank">GitHub Issue #11</a> - support multile values in single-line INSERT INTO statement.</li>
				<li><strong>Jan 12, 2014</strong> Initial release.</li>
			</ul>
			<?php $this->load->view('feedback'); ?>
		</div>
		<div class="col-md-4">
			<?php
				$this->load->view('carbonads');
				//$this->load->view(rand(1,2) == 1 ? "ludo" : "miamboom");
			?>
		</div>
	</div>
</div>