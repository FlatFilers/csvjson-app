<div class="container">
	<div class="row">
		<div class="description col-md-12">
			<p>Convert your SQL table or database export to JSON or Javascript. Copy/paste or upload your SQL export to convert it. When converting to Javascript, one variable is created per table.</p>
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
<textarea id="sql" class="form-control input save" rows="15">
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
				</div>
			</div>
			<div class="form-group code-group">
				<label>Result</label>
				<textarea id="result" class="form-control result save" rows="15"></textarea>
			</div>
			<p class="help-block">Ctrl + A then Ctrl + C to copy to clipboard.</p>
			<a class="convert" href="#" title="Convert"><i class="glyphicon glyphicon-chevron-right"></i></a>
			<a class="clear" href="#" title="Clear"><i class="glyphicon glyphicon-remove"></i></a>
		</div>
	</div>
	<br/>
	<div class="row">
		<div class="col-md-12 about">
			<h4>About SQL to JSON</h4>
			<ul>
				<li>Works by detecting <code>CREATE TABLE</code> and <code>INSERT INTO</code> statements, in order to create an object representation of the tables.</li>
			</ul>
		</div>
	</div>
</div>