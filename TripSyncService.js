// ============================
// 3. TripSyncService.gs
// ============================
// Handles syncing a single trip from DISPATCH edit to LOG
class TripSyncService {
  constructor(dispatchSheetName = "DISPATCH") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    this.dispatchSheet = ss.getSheetByName(dispatchSheetName);
  }

  onDispatchSheetEdit(e) {
    const watchedCols = [1, 3, 4, 5, 10, 12, 13, 15, 17, 21, 25];
    const range = e.range;
    if (!range) return;

    const col = range.getColumn();
    const row = range.getRow();
    if (row < 2 || !watchedCols.includes(col)) return;

    const rowData = this.dispatchSheet.getRange(row, 1, 1, this.dispatchSheet.getLastColumn()).getValues()[0];
    const id = rowData[23]; // Column X
    if (!id) return;

    const trip = this.dispatchRowToTripObject(rowData);
    if (!trip?.id) return;

    const repo = new TripRepository();
    repo.addTrip(trip); // or repo.updateTrip(trip) if separated
  }

  dispatchRowToTripObject(row) {
    return {
      id: row[23],
      date: row[0],
      time: row[1],
      passenger: row[2],
      phone: row[3],
      transport: row[4],
      medicaid: row[5],
      invoice: row[6],
      pickup: row[9],
      dropoff: row[11],
      vehicle: row[12],
      driver: row[14],
      notes: row[22],
      returnOf: row[30] || "",
      status: row[24] || "",
    };
  }
}
