<div class="container px-4 py-5">
	<div class="row">
		<div class="description col-md-12">
			<h1 class="text-primary fw-bold">SQL <small class="bi bi-chevron-right"></small>JSON or JS</h1>
			<p>To get started, upload or paste your SQL Export.
			</div>
	</div>

	<div class="row gx-5">
		<div class="col-md-5 more-bottom-margin">
			<div class="mb-5">
				<label class="form-label">Upload a SQL file</label>
					<input id="fileupload" type="file" name="file"class="form-control" />
			</div>
			<div class="mb-3">
				<label class="form-label">Or paste your SQL here</label>
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
				<i class="bi bi-chevron-right"></i> Convert
			</button>
			<button id="clear" type="submit" class="btn btn-light">
				<i class="bi bi-backspace"></i> Clear
			</button>
		</div>

		<div class="col-md-7 more-bottom-margin">
			<div class="mb-5 pb-2">
				<div class="mb-2">Options</div>
				<div class="form-check-inline pt-1">
					<label class="form-check-label me-2">Output format: </label>
					<input type="radio" id="json" name="format" class="form-check-input save" value="json" checked="checked" />
					<label class="form-check-label">JSON</label>
				</div>
				<div class="form-check-inline">
					<input type="radio" id="javascript" name="format" class="form-check-input save" value="javascript" />
					<label class="form-check-label">JavaScript</label>
				</div>
				<div class="form-check-inline">
					<label class="form-check-label" title="Minify or compact result by removing spaces and new lines.">
						<input type="checkbox" id="minify" name="minify" class="form-check-input save" /> Minify
					</label>
				</div>
			</div>
			<?php $this->load->view('result_textarea_buttons_view', array('result_title' => 'Result', 'download' => 'csvjson.json')); ?>
		</div>
	</div>
</div>


<div class="container px-4 py-5" id="about-flatfile">

	<h2 class="pb-2 border-bottom">Need help cleaning data?</h2>

	<div class="row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4 py-5">
		<div class="col d-flex align-items-start">
			<div>
				<p>
					Embed all the functionality of csv<strong>json</strong>in any web application with <a href="https://flatfile.com/get-started?utm_source=csvjson-tools&amp;utm_medium=csvjson_header&amp;utm_campaign=q1-2022-csvjson-redesign&amp;ajs_event=came_from_csvjson&amp;ajs_prop_ccf_id=b8cdef6a-602c-4993-890c-752924b5ac2a&amp;__hstc=191284213.17efec156b05b5f65379d478482fed10.1642435230343.1643637413336.1644345002104.7&amp;__hssc=191284213.2.1644345002104&amp;__hsfp=668737353">Flatfile</a>. Auto-match columns, validate data fields, and provide an intuitive CSV import experience.
				</p>
			</div>
		</div>
	</div>

</div>

<div class="container px-4 py-5" id="about-csvjson">

	<h2 class="pb-2 border-bottom">More Details</h2>

	<div class="row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4 py-5">
		<div class="col d-flex align-items-start">
			<div>
				<ul>
					<li>Works by detecting <code>CREATE TABLE</code> and <code>INSERT INTO</code> statements, in order to create an object representation of the tables.</li>
				</ul>
				<p>
					<a class="btn btn-light" data-bs-toggle="collapse" href="#collapseOne" role="button" aria-expanded="false" aria-controls="collapseExample">
						View Change Log
					</a>
				</p>
			</div>
		</div>


		<div id="collapseOne" class="accordion-collapse collapse showclass row row-cols-1 row-cols-sm-1 row-cols-md-12 row-cols-lg-12 g-4">
				<div class="col d-flex align-items-start">
					<div>
						<h5>Jan 26, 2019</h5><p>Improvement: Removed 64k limit on download button.</p>
						<h5>Jan 8, 2018</h5><p>Support escaped quotes: <a href="https://github.com/FlatFilers/csvjson-app/issues/26">GitHub issue #26</a>. Thank you <a href="https://github.com/lbottoni" target="_blank">lbottoni</a> for reporting.</p>
						<h5>Dec 18, 2017</h5><p>Bug fix: Convert a <code>NULL</code> value to <code>null</code>.</p>
						<h5>Dec 18, 2017</h5><p>Improvement: Added option to minify or compact JSON. <a href="https://github.com/FlatFilers/csvjson-app/issues/21">GitHub issue #21</a></p>
						<h5>Dec 13, 2017</h5><p>Parsing bug fix not to split when detecting a comma in a string value: GitHub Issues <a href="https://github.com/FlatFilers/csvjson-app/issues/17" target="_blank">#17</a> and <a href="https://github.com/FlatFilers/csvjson-app/issues/25" target="_blank">#25</a>. Thank you <a href="https://github.com/Idafe" target="_blank">Idafe</a> and <a href="https://github.com/jdserato" target="_blank">Jay Vince Serato</a> for reporting the issue.</p>
						<h5>Sep 4, 2017</h5><p>Parsing bug fix: <a href="https://github.com/FlatFilers/csvjson-app/issues/22" target="_blank">GitHub Issue #22</a>.</p>
						<h5>Sep 29, 2016</h5><p>Bug fix <a href="https://github.com/FlatFilers/csvjson-app/issues/11" target="_blank">GitHub Issue #11</a> - support multile values in single-line INSERT INTO statement.</p>
						<h5>Jan 12, 2014</h5><p>Initial release.</p>
					</div>

				</div>
		</div>

	</div>

</div>
