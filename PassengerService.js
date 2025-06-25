// ============================
// 7. PassengerService.gs
// ============================
class PassengerService {
  constructor(passengerSheetName = "ADD PASSENGERS") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    this.sheet = ss.getSheetByName(passengerSheetName);
  }

  migrateAddPassengersToModularCache() {
    const data = this.sheet.getRange("A2:F").getValues();
    return data.map(row => ({
      name: row[0],
      phone: row[1],
      dob: row[2],
      medicaid: row[3],
      address: row[4],
      city: row[5]
    }));
  }

  getPassengerNames() {
    const names = this.sheet.getRange("A2:A").getValues().flat();
    return names.filter(name => !!name);
  }

  getPassengerProfiles() {
    const data = this.sheet.getRange("A2:F").getValues();
    return data.map(row => ({
      name: row[0],
      phone: row[1],
      dob: row[2],
      medicaid: row[3],
      address: row[4],
      city: row[5]
    }));
  }

  updatePassengerProfile(key, profile) {
    const data = this.sheet.getRange("A2:F").getValues();
    const rowIndex = data.findIndex(row => row[0] === key);
    if (rowIndex === -1) return;
    const updatedRow = [
      profile.name || "",
      profile.phone || "",
      profile.dob || "",
      profile.medicaid || "",
      profile.address || "",
      profile.city || ""
    ];
    this.sheet.getRange(rowIndex + 2, 1, 1, 6).setValues([updatedRow]);
  }
}