/* global _:true */
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	'sap/m/Label',
	'sap/m/Popover',
	'sap/ui/core/library',
	'sap/ui/core/format/DateFormat',
	'sap/ui/core/Fragment',
	'sap/base/Log',
	'sap/ui/export/library',
	'sap/ui/export/Spreadsheet',
	'sap/m/MessageToast',
	"rnv/teamplan/util/echarts",
	'sap/ui/core/HTML'
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, MessageBox, Label, Popover, coreLibrary, DateFormat, Fragment,
	Log, exportLibrary, Spreadsheet, MessageToast, echarts, HTML) {
	"use strict";

	var ValueState = coreLibrary.ValueState;
	var EdmType = exportLibrary.EdmType;
	return BaseController.extend("rnv.teamplan.controller.Worklist", {
		formatter: formatter,
		onInit: function () {
			this.getView().setModel(new JSONModel({}), "NewAppointMent");
			this._onGetAuothorization();
		},
		/**
		 * Kullanıcıların yetkisine göre 
		 * Takımım planı butonun aktif olması
		 * Oluşturma düzenleme silme yetkisinin kontrolü
		 */
		_onGetAuothorization: function () {
			this.getOwnerComponent().getModel().callFunction("/GetAuthorization", {
				method: "GET",
				urlParemeters: null,
				async: false,
				success: function (oData) {
					this.getView().setBusy(false);
					this.getView().setModel(new JSONModel(oData.GetAuthorization), "Authorization");
					this._onGetSearchHelpValues();
				}.bind(this),
				error: function (oError) {
					this.getView().setBusy(false);
				}.bind(this)
			});
		},
		/**
		 * Search Help verileri çekilir
		 */
		_onGetSearchHelpValues: function () {
			var aFilter = [];
			aFilter.push(new Filter("Type", FilterOperator.EQ, 'TeamplanSH'));
			this.getView().setBusy(true);
			this.getOwnerComponent().getModel().read("/SearchHelpSet", {
				filters: aFilter,
				sorters: null,
				async: false,
				success: function (oData) {
					this.getView().setBusy(false);

					//Projeler
					var aProject = JSON.parse(oData.results.filter(function (x) {
						return x.Name === "PROJECT";
					})[0].Values);
					var oProjectModel = new JSONModel(aProject);
					this.getView().setModel(oProjectModel, "ProjectModel");

					//Uzmanlıklar
					var aExpertise = JSON.parse(oData.results.filter(function (x) {
						return x.Name === "EXPERTISE";
					})[0].Values);
					var oExpertiseModel = new JSONModel(aExpertise);
					this.getView().setModel(oExpertiseModel, "ExpertiseModel");

					//Danışmanlar
					var aPersonnel = JSON.parse(oData.results.filter(function (x) {
						return x.Name === "PERSONNEL";
					})[0].Values);
					var oPersonnelModel = new JSONModel(aPersonnel);
					this.getView().setModel(oPersonnelModel, "PersonnelModel");

					//Lokasyonlar
					var aLocation = JSON.parse(oData.results.filter(function (x) {
						return x.Name === "LOCATION";
					})[0].Values);
					var oLocationModel = new JSONModel(aLocation);
					this.getView().setModel(oLocationModel, "LocationModel");

					//Takımlar
					var aTeam = JSON.parse(oData.results.filter(function (x) {
						return x.Name === "TEAM";
					})[0].Values);
					var oTeamModel = new JSONModel(aTeam);
					this.getView().setModel(oTeamModel, "TeamModel");

					//Kullanıcı Tipi
					var aUserType = JSON.parse(oData.results.filter(function (x) {
						return x.Name === "USER_TYPE";
					})[0].Values);
					var oUserTypeModel = new JSONModel(aUserType);
					this.getView().setModel(oUserTypeModel, "UserTypeModel");
					
					//cuma itibariyle bir sonraki hafta default gelsin
					var d = new Date();
					if (d.getDay() >= 5 ) {
						var dNextWeek = new Date();
						dNextWeek.setDate(this.byId("PC1").getStartDate().getDate() + 7);
						this.byId("PC1").setStartDate(dNextWeek);
					}

					var aFilters = [];
					var dStartDate = this.byId("PC1").getStartDate(),
						dEndDate = new Date();
					dEndDate.setDate(this.byId("PC1").getStartDate().getDate() + 6);
					aFilters.push(new Filter("ViewType", FilterOperator.EQ, 'all')); //Benim Planım, Takımın Planı,  
					aFilters.push(new Filter("ViewKey", FilterOperator.EQ, 'Week')); //Saatlik, Günlük, Haftalık, Aylık
					aFilters.push(new Filter("PlanningDate", FilterOperator.BT, dStartDate, dEndDate));
					this.onGetAppointment(aFilters);

				}.bind(this),
				error: function (oError) {
					this.getView().setBusy(false);
				}.bind(this)
			});
		},
		/**
		 * Plan verilerinin çekilmesi
		 */
		onGetAppointment: function (aFilter) {
			this.getView().getModel().read("/PersonnelSet", {
				filters: aFilter,
				async: true,
				urlParameters: {
					"$expand": "PersonnelToAppointment"
				},
				success: function (oData) {
					var aData = oData.results;
					this.onSetPlan(aData);
				}.bind(this),
				error: function () {

				}
			});
		},
		/**
		 * Plan verilerinin takvime set edilmesi
		 */
		onSetPlan: function (aData) {
			var that = this;
			var aPersonnel = [];
			$.each(aData, function (i, personnel) {
				var aAppointment = [];
				$.each(personnel.PersonnelToAppointment.results, function (j, appointment) {
					var start = new Date(appointment.PlanningDate);
					start.setHours(0, 0, 0, 0);
					start.setMilliseconds(appointment.PlanningStartTime.ms);

					var end = new Date(appointment.PlanningDate);
					end.setHours(0, 0, 0, 0);
					end.setMilliseconds(appointment.PlanningEndTime.ms);

					appointment.start = start;
					appointment.end = end;

					var displayStart = new Date(appointment.PlanningDate);
					displayStart.setHours(0, 0, 0, 0);
					var displayEnd = new Date(appointment.PlanningDate);
					displayEnd.setHours(24, 0, 0, 0);

					var sViewKey = that.byId("PC1").getViewKey();
					appointment.displayStart = sViewKey === "Hour" ? start : displayStart;
					appointment.displayEnd = sViewKey === "Hour" ? end : displayEnd;

					aAppointment.push(appointment);
				});
				personnel.name = personnel.NameFirst + " " + personnel.NameLast;
				// personnel.freeDays = [6, 7];
				personnel.freeHours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 19, 20, 21, 22, 23];
				personnel.appointments = aAppointment;
				personnel.headers = [];
				aPersonnel.push(personnel);
			});

			var month = this.byId("PC1").getStartDate().getMonth();
			var day = this.byId("PC1").getStartDate().getDate();
			var year = this.byId("PC1").getStartDate().getFullYear();
			var dStartDate = new Date(year, month, day, 9, 0);
			var sPlanning = {
				startDate: dStartDate,
				people: aPersonnel
			};
			var oPlanningModel = new JSONModel(sPlanning);
			this.getView().setModel(oPlanningModel, "PlanningModel");
		},
		/**
		 * Planın üzerine tıklanması
		 */
		onAppointmentSelect: function (oEvent) {
			var oAppointment = oEvent.getParameter("appointment");
			if (oAppointment) {
				this._handleSingleAppointment(oAppointment);
			} else {
				this._handleGroupAppointments(oEvent);
			}
		},
		/**
		 * Tek planın üzerine tıklanması
		 */
		_handleSingleAppointment: function (oAppointment) {
			var oView = this.getView();
			if (oAppointment === undefined) {
				return;
			}

			if (!oAppointment.getSelected() && this._pDetailsPopover) {
				this._pDetailsPopover.then(function (oDetailsPopover) {
					oDetailsPopover.close();
				});
				return;
			}

			if (!this._pDetailsPopover) {
				this._pDetailsPopover = Fragment.load({
					id: oView.getId(),
					name: "rnv.teamplan.fragments.Details",
					controller: this
				}).then(function (oDetailsPopover) {
					oView.addDependent(oDetailsPopover);
					return oDetailsPopover;
				});
			}

			this._pDetailsPopover.then(function (oDetailsPopover) {
				this._setDetailsDialogContent(oAppointment, oDetailsPopover);
			}.bind(this));
		},
		/**
		 * Seçilen plan detayının dialoga set edilmesi
		 */
		_setDetailsDialogContent: function (oAppointment, oDetailsPopover) {
			this.sPerson = oAppointment.getParent().getBindingContext("PlanningModel").getProperty();
			this.sPlanning = oAppointment.getBindingContext("PlanningModel").getProperty();
			var sPlanningDetail = {
				id: this.sPerson.PersId,
				name: this.sPerson.NameFirst + " " + this.sPerson.NameLast,
				uname: this.sPerson.Uname,
				role: this.sPerson.ExpertiseFull,
				start: this.sPlanning.start,
				end: this.sPlanning.end,
				planningDate: this.sPlanning.PlanningDate,
				location: this.sPlanning.LocationText,
				description: this.sPlanning.Description,
				projectId: this.sPlanning.ProjId,
				project: this.sPlanning.ProjName,
				taskId: this.sPlanning.TaskId,
				task: this.sPlanning.TaskSubject
			};
			var oPlanningDetailModel = new JSONModel(sPlanningDetail);
			this.getView().setModel(oPlanningDetailModel, "PlanningDetailModel");
			sap.ui.getCore().setModel(oPlanningDetailModel, "PlanningDetailModel");
			oDetailsPopover.openBy(oAppointment);
		},
		/**
		 * Boş bir alana basılması ve plan oluşturma
		 */
		onAppointmentAddWithContext: function (oEvent) {
			var sData = this.getView().getModel("Authorization").getData();
			if (sData.Create !== true) {
				return;
			}
			this.oClickEventParameters = oEvent.getParameters();
			this._arrangeDialogFragment(this._aDialogTypes[1].type);
		},
		/**
		 * Plan Editleme
		 */
		onEditAppointment: function () {
			var oDetailsPopover = this.byId("detailsPopover");
			oDetailsPopover.close();
			this._arrangeDialogFragment(this._aDialogTypes[2].type);
		},
		/**
		 * Plan Silme
		 */
		onDeleteAppointment: function () {
			var oDetailsPopover = this.byId("detailsPopover");
			var aAppointment = [];
			var sAppointment = this.sPlanning;
			sAppointment.Deleted = true;
			delete sAppointment.start;
			delete sAppointment.end;
			delete sAppointment.displayStart;
			delete sAppointment.displayEnd;
			aAppointment.push(sAppointment);
			var sRequest = {
				PersId: this.sPerson.PersId,
				PersonnelToAppointment: aAppointment
			};

			this.getView().getModel().create("/PersonnelSet", sRequest, {
				async: true,
				success: function (oData, oResponse) {
					var oErrorHandler = this.getOwnerComponent()._oErrorHandler;
					var hdrMessage = oResponse.headers["sap-message"];
					if (hdrMessage !== undefined) {
						var hdrMessageObject = JSON.parse(hdrMessage);
						if (hdrMessageObject.message !== "") {
							oErrorHandler.displayError(hdrMessageObject.message);
							return;
						}
					}
					this.onSearch();
				}.bind(this),
				error: function (oData, oResponse) {

				}
			});
			oDetailsPopover.close();
		},
		_arrangeDialogFragment: function (iDialogType) {
			var oView = this.getView();
			if (!this._pNewAppointmentDialog) {
				this._pNewAppointmentDialog = Fragment.load({
					id: oView.getId(),
					name: "rnv.teamplan.fragments.Create",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}
			this._pNewAppointmentDialog.then(function (oDialog) {
				this._arrangeDialog(iDialogType, oDialog);
			}.bind(this));
		},
		_arrangeDialog: function (sDialogType, oDialog) {
			var sTempTitle = "";
			oDialog._sDialogType = sDialogType;
			if (sDialogType === "edit_appointment") {
				this._setEditAppointmentDialogContent(oDialog);
				sTempTitle = this._aDialogTypes[2].title;
			} else if (sDialogType === "create_appointment_with_context") {
				this._setCreateWithContextAppointmentDialogContent();
				sTempTitle = this._aDialogTypes[1].title;
			} else if (sDialogType === "create_appointment") {
				this._setCreateAppointmentDialogContent();
				sTempTitle = this._aDialogTypes[0].title;
			} else {
				Log.error("Wrong dialog type.");
			}
			// this.updateButtonEnabledState(oDialog);
			oDialog.setTitle(sTempTitle);
			oDialog.open();
		},
		/**
		 * Takvimden plan editleme
		 */
		_setEditAppointmentDialogContent: function (oDialog) {
			var sProperty = this.sPlanning;
			sProperty.PersId = this.sPerson.PersId;

			var start = new Date(this.sPlanning.PlanningDate);
			start.setHours(0, 0, 0, 0);
			start.setMilliseconds(this.sPlanning.PlanningStartTime.ms);

			var end = new Date(this.sPlanning.PlanningDate);
			end.setHours(0, 0, 0, 0);
			end.setMilliseconds(this.sPlanning.PlanningEndTime.ms);

			sProperty.PlanningStartTime = start;
			sProperty.PlanningEndTime = end;
			sProperty.Repeat = 1; //silerken hep tek satır silinecek
			delete sProperty.start;
			delete sProperty.end;
			delete sProperty.displayStart;
			delete sProperty.displayEnd;
			this.getView().setModel(new JSONModel(sProperty), "NewAppointMent");
		},
		/**
		 * Takvimden plan oluşturma
		 */
		_setCreateWithContextAppointmentDialogContent: function () {
			var sPersId = this.oClickEventParameters.row.getBindingContext("PlanningModel").getProperty().PersId;
			this.getView().setModel(new JSONModel({
				Repeat: 1,
				PersId: sPersId,
			}), "NewAppointMent");
			var oSelectedIntervalStart = this.oClickEventParameters.startDate,
				oStartDate = this.byId("startDate"),
				oTimeStart = this.byId("startTime"),
				oTimeEnd = this.byId("endTime"),
				oDateTimePickerStart = this.byId("startDate"),
				oMoreInfoInput = this.byId("moreInfo"),
				oLocation = this.byId("selectLocation"),
				oPersonSelected;

			oPersonSelected = this.byId("selectPerson");
			oPersonSelected.setSelectedKey(sPersId);
			oStartDate.setDateValue(oSelectedIntervalStart);
			oTimeStart.setValue(oSelectedIntervalStart.getHours() === 0 ? "09:00" : oSelectedIntervalStart.getHours().toString() + ":00");
			oTimeEnd.setValue("18:00");
			oMoreInfoInput.setValue("");
			oDateTimePickerStart.setValueState(ValueState.None);
			oLocation.setSelectedKey(100); //Remote
			delete this.oClickEventParameters;
		},
		/**
		 * Plan Kaydetme
		 */
		onSaveAppointment: function () {
			var iPersonId = this.byId("selectPerson").getSelectedKey(),
				oNewAppointmentDialog = this.byId("createDialog");

			var aAppointment = [];
			var sAppointment = this.getView().getModel("NewAppointMent").getData();

			var timeFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "PTHH'H'mm'M'ss'S'"
			});
			var startTime = this.byId("startTime").getDateValue();
			var endTime = this.byId("endTime").getDateValue();
			sAppointment.PlanningStartTime = timeFormat.format(startTime);
			sAppointment.PlanningEndTime = timeFormat.format(endTime);
			sAppointment.PlanningDate = this._getDate(this.byId("startDate").getDateValue());
			sAppointment.Repeat = parseInt(sAppointment.Repeat);
			sAppointment.Deleted = false;

			delete sAppointment.start;
			delete sAppointment.end;
			delete sAppointment.displayStart;
			delete sAppointment.displayEnd;

			aAppointment.push(sAppointment);
			var sRequest = {
				PersId: iPersonId,
				PersonnelToAppointment: aAppointment
			};

			//Zorunlu Alan Kontrolü
			var bSuccess = this.onObligatoryFieldCheck(this.byId("sfAppointment"));
			if (!bSuccess) {
				return;
			}

			this.getView().getModel().create("/PersonnelSet", sRequest, {
				async: true,
				success: function (oData, oResponse) {
					var oErrorHandler = this.getOwnerComponent()._oErrorHandler;
					var hdrMessage = oResponse.headers["sap-message"];
					if (hdrMessage !== undefined) {
						var hdrMessageObject = JSON.parse(hdrMessage);
						if (hdrMessageObject.message !== "") {
							oErrorHandler.displayError(hdrMessageObject.message);
							return;
						}
					}
					this.onSearch();
				}.bind(this),
				error: function (oData, oResponse) {

				}
			});
			oNewAppointmentDialog.close();
		},
		/**
		 * Plan Kaydetme İptal
		 */
		onCancelAppointment: function () {
			this.byId("createDialog").close();
		},
		/**
		 * Takvim Görüntü aralığının değiştirilmesi
		 */
		onViewChange: function (oEvent) {
			var dateObj = oEvent.getSource().getStartDate();
			var month = dateObj.getUTCMonth();
			var day = dateObj.getUTCDate();
			var year = dateObj.getUTCFullYear();
			oEvent.getSource().setStartDate(new Date(year, month, day, 9, 0));
			this.onSearch();
		},
		/**
		 * Takvim tarihinin değiştirilmesi
		 */
		onStartDateChange: function (oEvent) {
			this.onSearch();
		},
		/**
		 * Task Search Help
		 */
		onValueHelpTaskRequest: function () {
			this.getFormFragment(this, "TaskList", "idSelectTaskDialog").open();
			var aFilter = [];
			var ProjectID = this.getView().byId("selectProject").getSelectedKey();
			var PersID = this.getView().byId("selectPerson").getSelectedKey();
			aFilter.push(new Filter("Type", FilterOperator.EQ, 'TaskSH'));
			aFilter.push(new Filter("ProjId", FilterOperator.EQ, ProjectID));
			aFilter.push(new Filter("PersId", FilterOperator.EQ, PersID));
			this.getView().setBusy(true);
			this.getOwnerComponent().getModel().read("/SearchHelpSet", {
				filters: aFilter,
				sorters: null,
				async: false,
				success: function (oData) {
					this.getView().setBusy(false);

					//Task
					var aTask = JSON.parse(oData.results.filter(function (x) {
						return x.Name === "TASK";
					})[0].Values);
					var oTaskModel = new JSONModel(aTask);
					this.getView().setModel(oTaskModel, "TaskModel");

				}.bind(this),
				error: function (oError) {
					this.getView().setBusy(false);
				}.bind(this)
			});
		},
		/**
		 * Task Search Help Kapatma
		 */
		onValueHelpDialogClose: function (oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem"),
				oInput = this.byId("idTaskId");

			if (!oSelectedItem) {
				oInput.resetProperty("value");
				return;
			}
			oInput.setValue(oSelectedItem.getTitle());
			this.getView().getModel("NewAppointMent").setProperty("/TaskId", oSelectedItem.getDescription());
		},
		/**
		 * Task Search Help Arama
		 */
		onSearchTask: function (oEvent) {
			var aFilter = [];
			var sValue = oEvent.getParameter("value");
			aFilter.push(new Filter("subject", FilterOperator.Contains, sValue));
			var oBinding = oEvent.getParameter("itemsBinding");
			oBinding.filter(aFilter);
		},
		/**
		 * Filter Bar ve değiştiğinde tekrar veri çekilmesi gerektiğinde tetiklenir
		 */
		onSearch: function (oEvent) {
			var aFilters = [];
			var oProject = this.byId("mCBoxProject"),
				// oExpertise = this.byId("mCBoxExpertise"),
				oTeam = this.byId("mCBoxTeam"),
				oPersonnel = this.byId("mCBoxPersonnel"),
				oLocation = this.byId("mCBoxLocation"),
				oViewType = this.byId("sButtonViewType"),
				oShowOnlyWithFreeDays = this.byId("cBoxShowOnlyWithFreeDays");

			if (oProject.getSelectedItems().length > 0) {
				$.each(oProject.getSelectedItems(), function (i, el) {
					var sProjId = el.getBindingContext("ProjectModel").getProperty().projId;
					aFilters.push(new Filter("ProjId", FilterOperator.EQ, sProjId.toString().padStart(7, "0")));
				});
			}
			// if (oExpertise.getSelectedItems().length > 0) {
			// 	$.each(oExpertise.getSelectedItems(), function (i, el) {
			// 		aFilters.push(new Filter("ExpertiseId", FilterOperator.EQ, el.getBindingContext("ExpertiseModel").getProperty().expertiseId));
			// 	});
			// }
			if (oTeam.getSelectedItems().length > 0) {
				$.each(oTeam.getSelectedItems(), function (i, el) {
					aFilters.push(new Filter("Team", FilterOperator.EQ, el.getBindingContext("TeamModel").getProperty().teamKey));
				});
			}
			if (oPersonnel.getSelectedItems().length > 0) {
				$.each(oPersonnel.getSelectedItems(), function (i, el) {
					var sPersId = el.getBindingContext("PersonnelModel").getProperty().persId;
					aFilters.push(new Filter("PersId", FilterOperator.EQ, sPersId.toString().padStart(7, "0")));
				});
			}
			if (oLocation.getSelectedItems().length > 0) {
				$.each(oLocation.getSelectedItems(), function (i, el) {
					var sLocationId = el.getBindingContext("LocationModel").getProperty().locationId;
					aFilters.push(new Filter("LocationId", FilterOperator.EQ, sLocationId.toString().padStart(3, "0")));
				});
			}

			var dStartDate = this.byId("PC1").getStartDate(),
				dEndDate = new Date(this.byId("PC1").getStartDate());

			switch (this.byId("PC1").getViewKey()) {
			case 'Hour':
				dEndDate.setDate(this.byId("PC1").getStartDate().getDate() + 0);
				break;
			case 'Day':
				dEndDate.setDate(this.byId("PC1").getStartDate().getDate() + 13);
				break;
			case 'Month':
				dEndDate.setDate(this.byId("PC1").getStartDate().getDate() + 364);
				break;
			case 'Week':
				dEndDate.setDate(this.byId("PC1").getStartDate().getDate() + 6);
				break;
			case 'One Month':
				var year = this.byId("PC1").getStartDate().getFullYear();
				var month = this.byId("PC1").getStartDate().getMonth();
				dEndDate = new Date(year, month + 1, 0);
				break;
			default:
				// code block
			}
			aFilters.push(new Filter("PlanningDate", FilterOperator.BT, this._getDate(dStartDate), this._getDate(dEndDate)));
			aFilters.push(new Filter("ViewType", FilterOperator.EQ, oViewType.getSelectedKey()));
			aFilters.push(new Filter("ViewKey", FilterOperator.EQ, this.byId("PC1").getViewKey()));
			aFilters.push(new Filter("OnlySpaceDay", FilterOperator.EQ, oShowOnlyWithFreeDays.getSelected()));
			this.onGetAppointment(aFilters);
		},
		onClear: function () {
			var oProject = this.byId("mCBoxProject"),
				oPersonnel = this.byId("mCBoxPersonnel"),
				oTeam = this.byId("mCBoxTeam"),
				oLocation = this.byId("mCBoxLocation"),
				oShowOnlyWithFreeDays = this.byId("cBoxShowOnlyWithFreeDays");

			oProject.removeAllSelectedItems();
			oPersonnel.removeAllSelectedItems();
			oTeam.removeAllSelectedItems();
			oLocation.removeAllSelectedItems();
			oShowOnlyWithFreeDays.setSelected(false);
			this.getView().setModel(new JSONModel([]), "PlanningModel");
		},
		onShowReport: function () {
			this.getFormFragment(this, "Report", "reportDialog").open();
		},
		onCloseReport: function () {
			this.getFormFragment(this, "Report", "reportDialog").close();
		},
		onClearReport: function () {
			var oPlanningDate = sap.ui.getCore().byId("dRPlanningDate"),
				oProject = sap.ui.getCore().byId("mCBoxProject"),
				oPersonnel = sap.ui.getCore().byId("mCBoxPersonnel"),
				oTeam = sap.ui.getCore().byId("mCBoxTeam"),
				oUserType = sap.ui.getCore().byId("mcUserType"),
				oActiveProjects = sap.ui.getCore().byId("cBoxActiveProjects");

			oPlanningDate.setValue();
			oProject.removeAllSelectedItems();
			oPersonnel.removeAllSelectedItems();
			oTeam.removeAllSelectedItems();
			oUserType.removeAllSelectedItems();
			oActiveProjects.setSelected(false);
			this.onDrawChart([]);
		},
		onSearchReport: function () {
			var aFilters = [];

			var oPlanningDate = sap.ui.getCore().byId("dRPlanningDate"),
				oProject = sap.ui.getCore().byId("mCBoxProject"),
				oPersonnel = sap.ui.getCore().byId("mCBoxPersonnel"),
				oTeam = sap.ui.getCore().byId("mCBoxTeam"),
				oUserType = sap.ui.getCore().byId("mcUserType"),
				oActiveProjects = sap.ui.getCore().byId("cBoxActiveProjects");

			if (oPlanningDate.getDateValue() === null) {
				var oErrorHandler = this.getOwnerComponent()._oErrorHandler;
				oErrorHandler.displayError(this.getResourceBundle().getText("pleaseSelectPlanningDate"));
				return;
			}

			if (oProject.getSelectedItems().length > 0) {
				$.each(oProject.getSelectedItems(), function (i, el) {
					var sProjId = el.getBindingContext("ProjectModel").getProperty().projId;
					aFilters.push(new Filter("ProjId", FilterOperator.EQ, sProjId.toString().padStart(7, "0")));
				});
			}
			if (oTeam.getSelectedItems().length > 0) {
				$.each(oTeam.getSelectedItems(), function (i, el) {
					aFilters.push(new Filter("Team", FilterOperator.EQ, el.getBindingContext("TeamModel").getProperty().teamKey));
				});
			}
			if (oPersonnel.getSelectedItems().length > 0) {
				$.each(oPersonnel.getSelectedItems(), function (i, el) {
					var sPersId = el.getBindingContext("PersonnelModel").getProperty().persId;
					aFilters.push(new Filter("PersId", FilterOperator.EQ, sPersId.toString().padStart(7, "0")));
				});
			}
			if (oUserType.getSelectedItems().length > 0) {
				$.each(oUserType.getSelectedItems(), function (i, el) {
					var sProperty = el.getBindingContext("UserTypeModel").getProperty();
					aFilters.push(new Filter("UserType", FilterOperator.EQ, sProperty.id));
				});
			}

			aFilters.push(new Filter("PlanningDate", FilterOperator.BT, this._getDate(oPlanningDate.getDateValue()), this._getDate(
				oPlanningDate.getSecondDateValue())));
			if (oActiveProjects.getSelected()) {
				aFilters.push(new Filter("ProjStatus", FilterOperator.EQ, 'A'));
			}

			this.getView().setBusy(true);
			this.getOwnerComponent().getModel().read("/ReportSet", {
				filters: aFilters,
				sorters: null,
				async: false,
				success: function (oData, oResponse) {
					this.getView().setBusy(false);

					var oErrorHandler = this.getOwnerComponent()._oErrorHandler;
					var hdrMessage = oResponse.headers["sap-message"];
					if (hdrMessage !== undefined) {
						var hdrMessageObject = JSON.parse(hdrMessage);
						if (hdrMessageObject.message !== "") {
							oErrorHandler.displayError(hdrMessageObject.message);
							return;
						}
					}

					if (oData.results.length === 0) {
						oErrorHandler.displayError(this.getResourceBundle().getText("noDataAvailable"));
						return;
					}

					var sReportData = oData.results[0].ReportData;
					this.onDrawChart(JSON.parse(sReportData));
				}.bind(this),
				error: function (oError) {
					this.getView().setBusy(false);
				}.bind(this)
			});
		},
		onDrawChart: function (project) {
			var that = this;
			var myChart = echarts.init(sap.ui.getCore().byId("ec1").getDomRef());
			var option;

			var aProject = [];
			var aReport = [];
			$.each(project, function (i, proj) {
				var aPeople = [];
				$.each(proj.projtopersonnel, function (j, person) {
					aPeople.push({
						name: person.nameFirst + " " + person.nameLast + " / " + person.persTotalHour.toString(),
						value: person.persTotalHour,
					});
					aReport.push(person);
				});

				aProject.push({
					value: proj.projTotalHour,
					name: proj.projName + " / " + proj.projTotalHour.toString(),
					itemStyle: {
						color: proj.projectColor === undefined ? '' : proj.color
					},
					children: aPeople
				});
			});

			var oReportModel = new JSONModel(aReport);
			that.getView().setModel(oReportModel, "ReportModel");

			option = {
				darkMode: "auto",
				textStyle: {
					fontFamily: "Microsoft YaHei",
					fontSize: 12,
					fontStyle: "normal",
					fontWeight: "normal"
				},
				stateAnimation: {
					duration: 300,
					easing: "cubicOut"
				},
				animation: "auto",
				animationDuration: 1000,
				animationDurationUpdate: 500,
				animationEasing: "cubicInOut",
				animationEasingUpdate: "cubicInOut",
				animationThreshold: 2000,
				progressiveThreshold: 3000,
				progressive: 400,
				hoverLayerThreshold: 3000,
				useUTC: false,
				axisPointer: {
					show: "auto",
					z: 50,
					type: "line",
					snap: false,
					triggerTooltip: true,
					value: null,
					status: null,
					animation: null,
					animationDurationUpdate: 200,
					lineStyle: {
						color: "#B9BEC9",
						width: 1,
						type: "dashed"
					},
					shadowStyle: {
						color: "rgba(210, 219, 238, 0.2)"
					},
					label: {
						show: true,
						formatter: null,
						precision: "auto",
						margin: 3,
						color: "#fff"
					},
					handle: {
						show: false,
						size: 45,
						margin: 50,
						color: "#333",
						shadowBlur: 3,
						shadowColor: "#aaa",
						shadowOffsetX: 0,
						shadowOffsetY: 2,
						throttle: 40
					}
				},
				series: {
					type: 'sunburst',
					data: aProject,
					radius: [0, '95%'],
					emphasis: {
						focus: 'ancestor',
						label: {
							show: true
						}
					},
					label: {
						rotate: "radial",
						show: true,
						opacity: 1,
						align: "center",
						position: "inside",
						distance: 5,
						silent: true
					},
					itemStyle: {
						borderWidth: 1,
						borderColor: "white",
						borderType: "solid",
						shadowBlur: 0,
						shadowColor: "rgba(0, 0, 0, 0.2)",
						shadowOffsetX: 0,
						shadowOffsetY: 0,
						opacity: 1
					},
					animationType: "expansion",
					animationDuration: 1000,
					animationDurationUpdate: 500
				}
			};
			option && myChart.setOption(option);
		},
		onExportReport: function () {
			var aCols, aData, oSettings, oSheet;
			aCols = this.createColumnConfigExcel();
			aData = this.getView().getModel("ReportModel").getData();
			oSettings = {
				workbook: {
					columns: aCols
				},
				dataSource: aData,
				fileName: 'Ekip Planı Raporu'
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build()
				.then(function () {
					MessageToast.show('Planların dışa aktarma işlemi tamamlandı.');
				})
				.finally(oSheet.destroy);
		},

		/**
		 * Excel Dışarı Alma İşlemi
		 */
		onExport: function () {
			var aCols, aData, oSettings, oSheet;
			aCols = this.createColumnConfig();
			aData = [];
			var aPeople = this.getView().getModel("PlanningModel").getData().people;
			$.each(aPeople, function (i, person) {
				var aAppointment = person.PersonnelToAppointment.results;
				var sData = {};
				$.each(aCols, function (j, column) {
					sData[column.property] = '';
					var aDayAppointment = aAppointment.filter(function (x) {
						return column.property === x.PlanningDate.toLocaleDateString();
					});
					if (aDayAppointment.length > 0) {
						$.each(aDayAppointment, function (k, appointment) {
							var aStartTime = new Date(2022, 0);
							aStartTime.setMilliseconds(person.PersonnelToAppointment.results[0].PlanningStartTime.ms);
							var sStartime = aStartTime.toLocaleTimeString([], {
								timeStyle: 'short'
							});

							var aEndTime = new Date(2022, 0);
							aEndTime.setMilliseconds(person.PersonnelToAppointment.results[0].PlanningEndTime.ms);
							var sEndtime = aEndTime.toLocaleTimeString([], {
								timeStyle: 'short'
							});
							sData[column.property] = " " + sStartime + "-" + sEndtime + " " + appointment.ProjName + "-(" + appointment.LocationText +
								")";
						});
						sData[column.property].replace(/\s/g, '');
					}
				});
				sData.name = person.name;
				sData.ExpertiseFull = person.ExpertiseFull;
				aData.push(sData);
			});

			oSettings = {
				workbook: {
					columns: aCols
				},
				dataSource: aData,
				fileName: 'Ekip Planı'
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build()
				.then(function () {
					MessageToast.show('Planların dışa aktarma işlemi tamamlandı.');
				})
				.finally(oSheet.destroy);
		},
		/**
		 * Excel Konf. Düzenleme
		 */
		createColumnConfig: function () {
			var dStartDate = this.byId("PC1").getStartDate();
			var dEndDate = new Date();
			var sViewKey = this.byId("PC1").getViewKey();
			switch (sViewKey) {
			case 'Hour': //1 gün
				dEndDate.setDate(dStartDate.getDate() + 0);
				break;
			case 'Week': //7 gün
				dEndDate.setDate(dStartDate.getDate() + 6);
				break;
			case 'Day': //14 Gün
				dEndDate.setDate(dEndDate.getDate() + 13);
				break;
			case 'One Month': //1 Ay
				var year = dStartDate.getFullYear();
				var month = dStartDate.getMonth();
				var dEndDate = new Date(year, month + 1, 1, 23, 0);
				break;
			case 'Month': //12 Ay
				year = dStartDate.getFullYear();
				month = dStartDate.getMonth();
				dStartDate = new Date(year, month, 1, 23, 0);
				dEndDate = new Date(year + 1, month, 1, 23, 0);
				break;
			default:
				// code block
			}
			var aColumn = [];
			var sColumn = {
				label: this.getResourceBundle().getText("fullName"),
				property: 'name'
			};
			aColumn.push(sColumn);
			sColumn = {
				label: this.getResourceBundle().getText("expertiseFull"),
				property: 'ExpertiseFull'
			};
			aColumn.push(sColumn);
			var dCheckDate = new Date();
			dCheckDate.setDate(dStartDate.getDate());
			do {
				sColumn = {
					label: dCheckDate.toLocaleDateString(),
					property: dCheckDate.toLocaleDateString()
				};
				aColumn.push(sColumn);
				dCheckDate.setDate(dCheckDate.getDate() + 1);
			} while (dCheckDate <= dEndDate);
			return aColumn;
		},
		createColumnConfigExcel: function () {
			var oResourceBundle = this.getResourceBundle();
			return [{
				label: oResourceBundle.getText("projId"),
				property: 'projId'
			}, {
				label: oResourceBundle.getText("projName"),
				property: 'projName'
			}, {
				label: oResourceBundle.getText("projTotalHour"),
				property: 'projTotalHour',
				type: EdmType.Number
			}, {
				label: oResourceBundle.getText("persId"),
				property: 'persId'
			}, {
				label: oResourceBundle.getText("nameFirst"),
				property: 'nameFirst'
			}, {
				label: oResourceBundle.getText("nameLast"),
				property: 'nameLast'
			}, {
				label: oResourceBundle.getText("persTotalHour"),
				property: 'persTotalHour',
				type: EdmType.Number
			}, {
				label: oResourceBundle.getText("teamText"),
				property: 'teamText'
			}];
		},
		/**
		 * Aktivite uygulamasına parametreli gidilir
		 */
		onNavigateToActivityApp: function () {
			var that = this;
			var sProperty = this.getView().getModel("PlanningDetailModel").getData();
			var sNavigationPersMssg = this.getResourceBundle().getText("NavigationActivityMssg");
			MessageBox.confirm(sNavigationPersMssg, {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.OK,
				onClose: function (sAction) {
					if (sAction === "OK") {
						var msInHour = 1000 * 60 * 60;
						var sSpentTime = Math.round(Math.abs(sProperty.end - sProperty.start) / msInHour);
						if (sSpentTime === 9) { //8-17 klasik plan yapılıyor ve 9 saat oluyor fakat 1 saat öğlen arası olduğu için bu planları 8 saat olarak aktivite giriliyor
							sSpentTime = 8;
						}
						var sNavParam = {
							"ProjectId": sProperty.projectId,
							"TaskName": sProperty.task,
							"TaskId": sProperty.taskId,
							"SpentDate": sProperty.planningDate.toLocaleDateString(),
							"SpentTime": sSpentTime
						};
						that.onNavtoOtherApp("ZRNV_PERS_ACTIVITY", "manage", sNavParam);
					}
				}
			});
		},
		/**
		 * Doluluk Oranı Popover
		 */
		onPressOpenPopover: function (oEvent) {
			var oView = this.getView(),
				oSourceControl = oEvent.getSource();

			if (!this._pPopover) {
				this._pPopover = Fragment.load({
					id: oView.getId(),
					name: "rnv.teamplan.fragments.Ratio"
				}).then(function (oPopover) {
					oView.addDependent(oPopover);
					return oPopover;
				});
			}

			this._pPopover.then(function (oPopover) {
				oPopover.openBy(oSourceControl);
			});
		},
		/**
		 * Tarih Formatı
		 */
		formatDate: function (oDate) {
			if (oDate) {
				var iHours = oDate.getHours(),
					iMinutes = oDate.getMinutes(),
					iSeconds = oDate.getSeconds();

				if (iHours !== 0 || iMinutes !== 0 || iSeconds !== 0) {
					return DateFormat.getDateTimeInstance({
						style: "medium"
					}).format(oDate);
				} else {
					return DateFormat.getDateInstance({
						style: "medium"
					}).format(oDate);
				}
			}
		},
		/**
		 * Dialog tipleri
		 */
		_aDialogTypes: [{
			title: "Plan Oluştur",
			type: "create_appointment"
		}, {
			title: "Plan Oluştur",
			type: "create_appointment_with_context"
		}, {
			title: "Plan Düzenle",
			type: "edit_appointment"
		}]
	});
});