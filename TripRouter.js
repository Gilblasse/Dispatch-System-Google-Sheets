class TripRouter {
  openPassengerTripList(date) {
    const template = HtmlService.createTemplateFromFile('TripsPage');
    template.initialDate = date ?? new Date().toISOString().split('T')[0];
    const html = template.evaluate()
      .setTitle('Passenger Trips')
      .setWidth(400);
    SpreadsheetApp.getUi().showSidebar(html);
  }

  showAddTripSidebar(date) {
    const template = HtmlService.createTemplateFromFile('AddTripPage');
    template.initialDate = date || new Date().toISOString().split('T')[0];
    const html = template.evaluate()
      .setTitle('Add Trip')
      .setWidth(400);
    SpreadsheetApp.getUi().showSidebar(html);
  }

  openEditTripSidebar() {
    const html = HtmlService.createHtmlOutputFromFile('EditTripPage')
      .setTitle('Edit Trip')
      .setWidth(400);
    SpreadsheetApp.getUi().showSidebar(html);
  }

  showEditTripSidebar(id, date) {
    const template = HtmlService.createTemplateFromFile('EditTripPage');
    template.tripId = id;
    template.tripDate = date;
    const html = template.evaluate()
      .setTitle('Edit Trip')
      .setWidth(400);
    SpreadsheetApp.getUi().showSidebar(html);
  }

  showRestoreDatePicker() {
    const html = HtmlService.createHtmlOutputFromFile('DatePicker')
      .setWidth(300)
      .setHeight(180);
    SpreadsheetApp.getUi().showModalDialog(html, '📅 Restore Snapshot');
  }
}

const tripRouter = new TripRouter();

function openPassengerTripList(date) { tripRouter.openPassengerTripList(date); }
function showAddTripSidebar(date) { tripRouter.showAddTripSidebar(date); }
function openEditTripSidebar(id) { return tripRouter.openEditTripSidebar(id); }
function showEditTripSidebar(id, date) { tripRouter.showEditTripSidebar(id, date); }
function showRestoreDatePicker() { tripRouter.showRestoreDatePicker(); }
