class TripManager {
  constructor(service, logManager) {
    this.service = service;
    this.logManager = logManager;
  }

  get logSheet() {
    return this.service.getSheet('Dispatcher', 'LOG');
  }






  testOnEdit() {
    const sheet = spreadsheetService.getSheet('Dispatcher', 'DISPATCH');
    const editedRow = 88;
    const editedCol = 21;
    const range = sheet.getRange(editedRow, editedCol);
    const e = { range, source: sheet.getParent() };
    this.onDispatchSheetEdit(e);
  }

  onDispatchSheetEdit(e) {
    try {
      const sheet = e.source.getSheetByName('DISPATCH');
      if (!sheet) return;
      const watchedCols = [1, 3, 4, 5, 10, 12, 13, 15, 17, 21, 25];
      const editedRanges = e?.rangeList?.getRanges() || [e.range];
      for (const range of editedRanges) {
        const col = range.getColumn();
        const row = range.getRow();
        if (row < 2 || !watchedCols.includes(col)) continue;
        const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
        const id = rowData[23];
        if (!id) {
          Logger.log('⛔ Trip ID not found on row ' + row);
          continue;
        }
        const trip = dispatchRowToTripObject(rowData);
        if (!trip?.id) {
          Logger.log('⚠️ Invalid trip object on row ' + row);
          continue;
        }
        Logger.log('🔄 Syncing trip ' + trip.id + ' from DISPATCH → LOG');
        this.updateTripInLog(trip);
      }
    } catch (err) {
      Logger.log('❌ onChange error: ' + err.message);
    }
  }

  addTripToLog(trip) {
    const sheet = this.logSheet;
    const allData = sheet.getRange('A2:B101').getValues();
    const jsonCol = 2;
    if (!trip?.id) {
      Logger.log('❌ Missing trip ID.');
      return;
    }
    const normalizedDate = Utils.formatDateString(trip.date || '');
    let rowIndex = -1;
    let trips = [];
    if (normalizedDate === '') {
      rowIndex = 0;
      try {
        trips = JSON.parse(allData[0]?.[1] || '[]');
      } catch (e) {
        Logger.log('⚠️ Could not parse JSON in B2.');
        trips = [];
      }
    } else {
      rowIndex = allData.findIndex(row => {
        const rowDate = row[0];
        if (!rowDate) return false;
        const formatted = Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        return formatted === normalizedDate;
      });
      if (rowIndex !== -1) {
        try {
          trips = JSON.parse(allData[rowIndex][1] || '[]');
        } catch (e) {
          Logger.log('⚠️ Could not parse JSON in row ' + (rowIndex + 2));
          trips = [];
        }
      } else {
        sheet.appendRow([normalizedDate, '[]']);
        rowIndex = sheet.getLastRow() - 2;
      }
    }
    const newRow = this.logManager.tripToRow(trip);
    trips = trips.filter(t => t[23] !== trip.id);
    trips.push(newRow);
    const sorted = sortTripsByTime(trips);
    sheet.getRange(rowIndex + 2, jsonCol).setValue(JSON.stringify(sorted));
  }

  getTripsByDate(dateStr) {
    const sheet = this.logSheet;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowDate = Utils.formatDateString(data[i][0]);
      if (rowDate === dateStr) {
        const jsonStr = data[i][1];
        if (!jsonStr) return [];
        return this.logManager.jsonToTrips(jsonStr);
      }
    }
    return [];
  }

  getTripById(encodedId, date) {
    const id = decodeURIComponent(encodedId);
    const allData = this.getTripsByDate(date);
    const row = allData.find(r => r.id === id);
    return row || {};
  }

  getAllTrips() {
    const sheet = this.logSheet;
    const data = sheet.getRange('A2:B').getValues();
    const all = [];
    data.forEach(row => {
      try {
        const trips = JSON.parse(row[1] || '[]');
        all.push(...trips);
      } catch (e) {
        Logger.log('⚠️ Error reading JSON from row.');
      }
    });
    return all;
  }

  updateTripInLog(trip) {
    const sheet = this.logSheet;
    const allData = sheet.getRange('A2:B101').getValues();
    const jsonCol = 2;
    if (!trip?.id) return;
    const normalizedDate = Utils.formatDateString(trip.date || '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newDate = trip.date ? new Date(...normalizedDate.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v))) : new Date(today);
    const updatedRow = this.logManager.tripToRow(trip);
    let sourceRowIndex = -1;
    let sourceTrips = [];
    let sourceDateKey = null;
    for (let i = 0; i < allData.length; i++) {
      const rowDate = allData[i][0];
      const cellValue = allData[i][1];
      try {
        const trips = JSON.parse(cellValue || '[]');
        if (trips.some(t => t[23] === trip.id)) {
          sourceRowIndex = i;
          sourceTrips = trips;
          sourceDateKey = rowDate ? Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
          break;
        }
      } catch (e) {
        Logger.log('⚠️ Error parsing JSON in row ' + (i + 2));
      }
    }
    if (sourceRowIndex === -1) return;
    const isSameDate = sourceDateKey === normalizedDate;
    const isUndated = normalizedDate === '';
    const isFutureOrToday = newDate >= today;
    if (isSameDate) {
      const updatedTrips = sortTripsByTime(sourceTrips.map(t => (t[23] === trip.id ? updatedRow : t)));
      sheet.getRange(sourceRowIndex + 2, jsonCol).setValue(JSON.stringify(updatedTrips));
      return;
    }
    if (!isUndated && isFutureOrToday) {
      const filtered = sourceTrips.filter(t => t[23] !== trip.id);
      sheet.getRange(sourceRowIndex + 2, jsonCol).setValue(JSON.stringify(filtered));
      let targetRowIndex = allData.findIndex(row => {
        const rowDate = row[0];
        if (!rowDate) return false;
        const formatted = Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        return formatted === normalizedDate;
      });
      if (targetRowIndex !== -1) {
        let targetTrips = [];
        try {
          targetTrips = JSON.parse(allData[targetRowIndex][1] || '[]');
        } catch (e) {
          Logger.log('⚠️ Could not parse JSON at target row ' + (targetRowIndex + 2));
        }
        targetTrips.push(updatedRow);
        const sorted = sortTripsByTime(targetTrips);
        sheet.getRange(targetRowIndex + 2, jsonCol).setValue(JSON.stringify(sorted));
      } else {
        sheet.appendRow([normalizedDate, JSON.stringify([updatedRow])]);
      }
      return;
    }
    if (isUndated) {
      let undatedTrips = [];
      try {
        undatedTrips = JSON.parse(sheet.getRange(2, jsonCol).getValue() || '[]');
      } catch (e) {
        Logger.log('⚠️ Could not parse undated trip JSON at B2');
      }
      const filtered = sourceTrips.filter(t => t[23] !== trip.id);
      sheet.getRange(sourceRowIndex + 2, jsonCol).setValue(JSON.stringify(filtered));
      undatedTrips.push(updatedRow);
      const sorted = sortTripsByTime(undatedTrips);
      sheet.getRange(2, jsonCol).setValue(JSON.stringify(sorted));
    }
  }

  deleteTripFromLog(id, date) {
    const sheet = this.logSheet;
    const allData = sheet.getRange('A2:B101').getValues();
    const jsonCol = 2;
    if (!id) return;
    const isUndated = !date || String(date).trim() === '';
    const targetDate = isUndated ? '' : Utils.formatDateString(date);
    let rowIndex = -1;
    let trips = [];
    for (let i = 0; i < allData.length; i++) {
      const rowDate = allData[i][0];
      const formattedDate = rowDate ? Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
      if (formattedDate === targetDate) {
        rowIndex = i;
        break;
      }
    }
    if (rowIndex === -1) return;
    const range = sheet.getRange(rowIndex + 2, jsonCol);
    try {
      trips = JSON.parse(range.getValue() || '[]');
    } catch (e) {
      Logger.log('⚠️ Could not parse existing JSON in row ' + (rowIndex + 2));
      return;
    }
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
      trips = trips.filter(trip => {
        const returnOf = trip[30] || '';
        return returnOf !== originalId;
      });
    }
    const sorted = sortTripsByTime(trips);
    range.setValue(JSON.stringify(sorted));
  }
}

const tripManager = new TripManager(spreadsheetService, logManager);

function addTripToLog(trip) { return tripManager.addTripToLog(trip); }
function getTripsByDate(dateStr) { return tripManager.getTripsByDate(dateStr); }
function getTripById(encodedId, date) { return tripManager.getTripById(encodedId, date); }
function getAllTrips() { return tripManager.getAllTrips(); }
function updateTripInLog(trip) { return tripManager.updateTripInLog(trip); }
function deleteTripFromLog(id, date) { return tripManager.deleteTripFromLog(id, date); }
