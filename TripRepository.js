// ============================
// 1. TripRepository.gs
// ============================
// Handles all operations related to LOG sheet: add, update, delete, get
class TripRepository {
  constructor(logSheetName = "LOG") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    this.logSheet = ss.getSheetByName(logSheetName);
  }

  addTrip(trip) {
    const allData = this.logSheet.getRange("A2:B101").getValues();
    const jsonCol = 2;
    if (!trip?.id) return;
    const normalizedDate = TripFormatter.formatDateString(trip.date);

    let rowIndex = -1;
    let trips = [];

    if (!normalizedDate) {
      rowIndex = 0;
      try { trips = JSON.parse(allData[0]?.[1] || "[]"); } 
      catch { trips = []; }
    } else {
      rowIndex = allData.findIndex(row => {
        const rowDate = row[0];
        if (!rowDate) return false;
        const formatted = Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), "yyyy-MM-dd");
        return formatted === normalizedDate;
      });

      if (rowIndex !== -1) {
        try { trips = JSON.parse(allData[rowIndex][1] || "[]"); } 
        catch { trips = []; }
      } else {
        this.logSheet.appendRow([normalizedDate, "[]"]);
        rowIndex = this.logSheet.getLastRow() - 2;
      }
    }

    const newRow = TripFormatter.tripObjectToRowArray(trip);
    trips = trips.filter(t => t[23] !== trip.id);
    trips.push(newRow);
    const sorted = TripFormatter.sortTripsByTime(trips);
    this.logSheet.getRange(rowIndex + 2, jsonCol).setValue(JSON.stringify(sorted));
  }

  getTripsByDate(dateStr) {
    const data = this.logSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowDate = TripFormatter.formatDateString(data[i][0]);
      if (rowDate === dateStr) {
        const jsonStr = data[i][1];
        if (!jsonStr) return [];
        return TripFormatter.convertRawData(jsonStr);
      }
    }
    return [];
  }

  getTripById(encodedId, date) {
    const id = decodeURIComponent(encodedId);
    const allData = this.getTripsByDate(date);
    return allData.find(row => row.id === id) || {};
  }

  getAllTrips() {
    const data = this.logSheet.getRange("A2:B").getValues();
    const all = [];
    for (const row of data) {
      try {
        const trips = JSON.parse(row[1] || "[]");
        all.push(...trips);
      } catch {}
    }
    return all;
  }

  deleteTrip(id, date) {
    const allData = this.logSheet.getRange("A2:B101").getValues();
    const jsonCol = 2;
    if (!id) return;
    const isUndated = !date || String(date).trim() === "";
    const targetDate = isUndated ? "" : TripFormatter.formatDateString(date);

    let rowIndex = -1;
    let trips = [];

    for (let i = 0; i < allData.length; i++) {
      const rowDate = allData[i][0];
      const formatted = rowDate
        ? Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), "yyyy-MM-dd")
        : "";
      if (formatted === targetDate) {
        rowIndex = i;
        break;
      }
    }
    if (rowIndex === -1) return;

    const range = this.logSheet.getRange(rowIndex + 2, jsonCol);
    try { trips = JSON.parse(range.getValue() || "[]"); } catch { return; }

    let tripToDelete = null;
    trips = trips.filter(trip => {
      const tripId = Array.isArray(trip) ? trip[23] : trip.id;
      if (tripId === id) {
        tripToDelete = trip;
        return false;
      }
      return true;
    });

    if (tripToDelete && Array.isArray(tripToDelete)) {
      const originalId = tripToDelete[23];
      trips = trips.filter(trip => trip[30] !== originalId);
    }

    const sorted = TripFormatter.sortTripsByTime(trips);
    range.setValue(JSON.stringify(sorted));
  }
}