/* global QUnit */

QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function() {
	"use strict";

	sap.ui.require([
		"rnv/teamplan/test/integration/AllJourneys"
	], function() {
		QUnit.start();
	});
});