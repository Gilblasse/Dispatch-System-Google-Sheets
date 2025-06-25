// ============================
// 9. VehicleService.gs
// ============================
class VehicleService {
  constructor(vehicleSheetName = "vehicles") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    this.sheet = ss.getSheetByName(vehicleSheetName);
  }

  getVehicleOptions() {
    const data = this.sheet.getRange("B2:E").getValues();
    return data.filter(row => !!row[0]).map(row => ({
      name: row[0],         // Column B
      nickname: row[1],     // Column C
      yearMakeModel: row[2],// Column D
      plate: row[3]         // Column E
    }));
  }

  getVehicleOptions() {
    const data = this.sheet.getRange("B2:B").getValues().flat();
    return data.filter(name => !!name);
  }
}

