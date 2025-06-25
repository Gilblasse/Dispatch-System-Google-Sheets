// ============================
// 2. TripSnapshotService.gs
// ============================
// Handles snapshot creation, restoring, and deletion for DISPATCH <=> LOG
class TripSnapshotService {
  constructor(logSheetName = "LOG", dispatchSheetName = "DISPATCH") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    this.logSheet = ss.getSheetByName(logSheetName);
    this.dispatchSheet = ss.getSheetByName(dispatchSheetName);
  }

  snapshotDispatchToLog(isAlert = false) {
    const data = this.dispatchSheet.getRange("A2:Y100").getValues();
    const logRange = this.logSheet.getRange("A2:B101").getValues();
    const dateToRow = {};
    const logDataByDate = {};
    let blankRow = null;

    logRange.forEach((row, i) => {
      const dateVal = row[0];
      const key = dateVal === '' || dateVal == null
        ? ''
        : Utilities.formatDate(new Date(dateVal), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (key === '' && blankRow === null) blankRow = i + 2;
      dateToRow[key] = i + 2;
      try {
        logDataByDate[key] = JSON.parse(row[1] || '[]');
      } catch (e) {
        logDataByDate[key] = [];
      }
    });

    const groupedByDate = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const row of data) {
      const rawDate = row[0];
      const time = row[2] || "23:58";
      const passenger = row[3];
      if (!passenger) continue;

      const isBlank = rawDate === '' || rawDate == null;
      let dateKey = '';

      if (!isBlank) {
        const dateObj = rawDate instanceof Date ? rawDate : new Date(rawDate);
        if (isNaN(dateObj)) continue;
        dateObj.setHours(0, 0, 0, 0);
        if (dateObj < today) continue;
        dateKey = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }

      const trip = [...row];
      trip[0] = dateKey || '';
      trip[2] = time;

      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
      groupedByDate[dateKey].push(trip);
    }

    for (const [dateKey, dispatchTrips] of Object.entries(groupedByDate)) {
      const logTrips = logDataByDate[dateKey] || [];
      const mergedMap = Object.fromEntries(logTrips.map(t => [t[23], t]));

      for (const trip of dispatchTrips) {
        const id = trip[23];
        if (id) mergedMap[id] = trip;
      }

      const mergedTrips = TripFormatter.sortTripsByTime(Object.values(mergedMap));
      const json = JSON.stringify(mergedTrips);
      let row = dateToRow[dateKey];

      if (dateKey === '') {
        row = 2;
        this.logSheet.getRange(row, 1).setValue("");
        this.logSheet.getRange(row, 2).setValue(json);
      } else {
        if (row) {
          this.logSheet.getRange(row, 2).setValue(json);
        } else {
          const newRow = this.logSheet.getLastRow() + 1;
          this.logSheet.getRange(newRow, 1, 1, 2).setValues([[dateKey, json]]);
        }
      }
    }

    if (isAlert) {
      SpreadsheetApp.getUi().alert(`✅ Snapshot was taken of DISPATCH`);
    }
  }

  deleteTodaysLogsThenUpdateSnapshotDispatchToLog() {
    const logData = this.logSheet.getRange("A2:B" + this.logSheet.getLastRow()).getValues();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const rowsToClear = [];

    for (let i = 0; i < logData.length; i++) {
      const dateCell = logData[i][0];
      let key = '';
      if (dateCell === '' || dateCell == null) {
        key = '';
      } else {
        const dateObj = new Date(dateCell);
        if (!isNaN(dateObj)) {
          dateObj.setHours(0, 0, 0, 0);
          key = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
      }
      if (key === todayKey || key === '') {
        rowsToClear.push(i + 2);
      }
    }

    rowsToClear.forEach(row => {
      this.logSheet.getRange(row, 2).clearContent();
    });

    this.snapshotDispatchToLog(true);
  }

  restoreDispatchFromLog(date) {
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day, 12);
    const targetDate = Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    const logData = this.logSheet.getRange("A2:B").getValues();
    const rowIndex = logData.findIndex(row => {
      const rowDate = row[0];
      if (!rowDate) return false;
      const formatted = Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), "yyyy-MM-dd");
      return formatted === targetDate;
    });

    if (rowIndex === -1) {
      SpreadsheetApp.getUi().alert(`⚠️ No snapshot found for ${targetDate}`);
      return;
    }

    const json = logData[rowIndex][1];
    if (!json) {
      SpreadsheetApp.getUi().alert(`⚠️ Snapshot for ${targetDate} is empty.`);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      SpreadsheetApp.getUi().alert(`❌ Error parsing snapshot JSON for ${targetDate}`);
      return;
    }

    parsed = parsed.map(row => {
      const toCleanTime = val => {
        if (!val || isNaN(new Date(val))) return "";
        const d = new Date(val);
        return new Date(1899, 11, 30, d.getHours(), d.getMinutes());
      };

      row[0] = new Date(year, month - 1, day);
      row[1] = toCleanTime(row[1]);
      row[2] = toCleanTime(row[2]);
      row[11] = toCleanTime(row[11]);
      row[14] = toCleanTime(row[14]);

      return row;
    });

    this.dispatchSheet.getRange("A2:Y100").clearContent();
    if (parsed.length > 0) {
      this.dispatchSheet.getRange(2, 1, parsed.length, parsed[0].length).setValues(parsed);
      this.dispatchSheet.getRange("J2:J100").setNumberFormat("@STRING@");
      this.dispatchSheet.getRange("J2:J100").setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

      applyFormulas(this.dispatchSheet, dispatchSheetFormulas);
      SpreadsheetApp.getUi().alert(`✅ Restored ${parsed.length} rows to DISPATCH from ${targetDate}`);
    } else {
      SpreadsheetApp.getUi().alert(`⚠️ No rows to restore for ${targetDate}`);
    }
  }
}
