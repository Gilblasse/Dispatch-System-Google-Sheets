// ============================
// 4. TripUIController.gs
// ============================
class TripUIController {
  showAddTripSidebar(date) {
    const template = HtmlService.createTemplateFromFile("AddTripPage");
    template.date = date;
    const html = template.evaluate().setTitle("Add Trip").setWidth(320);
    SpreadsheetApp.getUi().showSidebar(html);
  }

  showEditTripSidebar(id, date) {
    const template = HtmlService.createTemplateFromFile("EditTripPage");
    template.id = id;
    template.date = date;
    const html = template.evaluate().setTitle("Edit Trip").setWidth(320);
    SpreadsheetApp.getUi().showSidebar(html);
  }

  openPassengerTripList(date) {
    const template = HtmlService.createTemplateFromFile("PassengerTripList");
    template.date = date;
    const html = template.evaluate().setTitle("Passenger Trips").setWidth(320);
    SpreadsheetApp.getUi().showSidebar(html);
  }

  showRestoreDatePicker() {
    const template = HtmlService.createTemplateFromFile("RestoreDatePicker");
    const html = template.evaluate().setTitle("Restore Trips").setWidth(300);
    SpreadsheetApp.getUi().showSidebar(html);
  }
}