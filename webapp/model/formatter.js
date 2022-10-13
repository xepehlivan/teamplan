sap.ui.define([], function () {
	"use strict";

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		numberUnit: function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},
		taskLinkVisible: function (task,uname) {
			var sFioriUser = sap.ushell.Container.getService("UserInfo").getId();
			if (sFioriUser === uname && task !== '0000000') {
				return true;
			}
			return false;
		},
		taskTextVisible: function (task,uname) {
			var sFioriUser = sap.ushell.Container.getService("UserInfo").getId();
			if (sFioriUser !== uname && task !== '0000000') {
				return true;
			}
			return false;
		},
		editEnabled: function(planningId){
			if(planningId !== undefined && planningId !== ''){
				return false;
			}
			return true;
		}
	};
});