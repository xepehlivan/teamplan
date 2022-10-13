sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"sap/m/library",
	"sap/m/MessageToast"
], function (Controller, UIComponent, mobileLibrary, MessageToast) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return Controller.extend("rnv.teamplan.controller.BaseController", {
		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress: function () {
			var oViewModel = (this.getModel("objectView") || this.getModel("worklistView"));
			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		getFormFragment: function (that, FragmentName, FragmentId) {
			that._formFragment = sap.ui.getCore().byId(FragmentId);
			if (!that._formFragment) {
				that._formFragment = sap.ui.xmlfragment("rnv.teamplan.fragments." + FragmentName, that);
				that.getView().addDependent(that._formFragment);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", that.getView(), that._formFragment);
			}

			return that._formFragment;
		},
		_getDate: function (date) {
			var dTempDate = date;
			if (date !== null) {
				if (3 > parseInt(dTempDate.getHours())) {
					date.setHours(dTempDate.getHours() + 3);
					return date;
				} else {
					return dTempDate;
				}
			}
		},
		/**
		 * Tüm ekranlardaki zorunlu alan kontrolünü
		 * bu ortak fonksiyon ile yapılır
		 */
		onObligatoryFieldCheck: function (oForm) {
			var error = false;
			for (var i = 0; i < oForm.getContent().length; i++) {
				//hem simple form hemde kontrol edilecek obje visible true olmalı 
				if (oForm.getContent()[i].getParent().getVisible() && oForm.getContent()[i].getVisible()) {
					switch (oForm.getContent()[i].getMetadata().getName()) {
					case "sap.m.Input":
						if (oForm.getContent()[i].getRequired()) {
							if (oForm.getContent()[i].getValue().trim() === "" || oForm.getContent()[i].getValue().trim() === "-" || oForm.getContent()[i]
								.getValue().trim() === "0,00") {
								oForm.getContent()[i].setValueState("Error");
								error = true;
							} else {
								oForm.getContent()[i].setValueState("None");
							}
						} else {
							oForm.getContent()[i].setValueState("None");
						}
						break;
					case "sap.m.MaskInput":
						if (oForm.getContent()[i].getRequired()) {
							if (oForm.getContent()[i].getValue().trim() === "" || oForm.getContent()[i].getValue().trim() === "-" || oForm.getContent()[i]
								.getValue().trim() === "0,00") {
								oForm.getContent()[i].setValueState("Error");
								error = true;
							} else {
								oForm.getContent()[i].setValueState("None");
							}
						} else {
							oForm.getContent()[i].setValueState("None");
						}
						break;
					case "sap.m.ComboBox":
						if (oForm.getContent()[i].getRequired()) {
							if (oForm.getContent()[i].getSelectedKey().trim() === "" || oForm.getContent()[i].getSelectedKey().trim() === "-" || oForm.getContent()[
									i].getSelectedKey().trim() === "0,00") {
								oForm.getContent()[i].setValueState("Error");
								error = true;
							} else {
								oForm.getContent()[i].setValueState("None");
							}
						} else {
							oForm.getContent()[i].setValueState("None");
						}
						break;
					case "sap.m.Select":
						if (oForm.getContent()[i].getRequired()) {
							if (oForm.getContent()[i].getSelectedKey().trim() === "" || oForm.getContent()[i].getSelectedKey().trim() === "-" || oForm.getContent()[
									i].getSelectedKey().trim() === "0,00") {
								oForm.getContent()[i].setValueState("Error");
								error = true;
							} else {
								oForm.getContent()[i].setValueState("None");
							}
						} else {
							oForm.getContent()[i].setValueState("None");
						}
						break;
					case "sap.m.TextArea":
						if (oForm.getContent()[i].getRequired()) {
							if (oForm.getContent()[i].getValue().trim() === "" || oForm.getContent()[i].getValue().trim() === "-" || oForm.getContent()[i]
								.getValue()
								.trim() === "0,00") {
								oForm.getContent()[i].setValueState("Error");
								error = true;
							} else {
								oForm.getContent()[i].setValueState("None");
							}
						} else {
							oForm.getContent()[i].setValueState("None");
						}
						break;
					case "sap.m.DatePicker":
						if (oForm.getContent()[i].getRequired()) {
							if (oForm.getContent()[i].getValue().trim() === "" || oForm.getContent()[i].getValue().trim() === "-" || oForm.getContent()[i]
								.getValue()
								.trim() === "0,00") {
								oForm.getContent()[i].setValueState("Error");
								error = true;
							} else {
								oForm.getContent()[i].setValueState("None");
							}
						} else {
							oForm.getContent()[i].setValueState("None");
						}
						break;
					case "sap.m.TimePicker":
						if (oForm.getContent()[i].getRequired()) {
							if (oForm.getContent()[i].getValue().trim() === "" || oForm.getContent()[i].getValue().trim() === "-" || oForm.getContent()[i]
								.getValue().trim() === "0,00") {
								oForm.getContent()[i].setValueState("Error");
								error = true;
							} else {
								oForm.getContent()[i].setValueState("None");
							}
						} else {
							oForm.getContent()[i].setValueState("None");
						}
						break;
					default:
					}
				}
			}
			if (!error) {
				return true;
			} else {
				MessageToast.show("Boş alanları doldurunuz.");
				return false;
			}
		},
		/**
		 * Alt uygulamalara yönelme 
		 */
		onNavtoOtherApp: function (semanticObject, action, params) {
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			// generates a hash for the Fiori Launchpad to follow
			var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: semanticObject,
					action: action
				},
				params: params
			})) || "";

			// navigates to the new hash
			oCrossAppNavigator.toExternal({
				target: {
					shellHash: hash
				}
			});
		}
	});
});