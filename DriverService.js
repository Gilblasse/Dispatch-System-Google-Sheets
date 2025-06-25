// ============================
// 8. DriverService.gs
// ============================
class DriverService {
  constructor(staffSheetName = "STAFF") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    this.sheet = ss.getSheetByName(staffSheetName);
  }

  getDriverOptions() {
    const data = this.sheet.getRange("A2:A").getValues().flat();
    return data.filter(name => !!name);
  }
}