const logIndexCache = {};

class TripManager {
  constructor(service, logManager) {
    this.service = service;
    this.logManager = logManager;
  }

  get logSheet() {
    return this.service.getSheet('Dispatcher', 'LOG');
  }

  /**
   * Normalize time strings to ISO date anchored at 1899-12-30.
   * Accepts "HH:mm" or "HH:mm:ss" and returns
   * "1899-12-30THH:MM:SSZ".
   * If the value already looks like an ISO string, it is converted
   * to the same anchored date.
   * @param {string} timeStr
   * @return {string}
   */
  normalizeTimeString(timeStr) {
    if (!timeStr) return '';
    const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr);
    if (match) {
      const h = match[1];
      const m = match[2];
      const s = match[3] || '00';
      return `1899-12-30T${h}:${m}:${s}Z`;
    }
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (!isNaN(d)) {
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        const ss = String(d.getUTCSeconds()).padStart(2, '0');
        return `1899-12-30T${hh}:${mm}:${ss}Z`;
      }
    }
    return timeStr;
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
    if (Array.isArray(trip)) {
      trip.forEach(t => this.addTripToLog(t));
      return;
    }
    trip.time = this.normalizeTimeString(trip.time);
    if (trip.standingOrder && trip.standingOrder.returnTime) {
      trip.standingOrder.returnTime = this.normalizeTimeString(trip.standingOrder.returnTime);
    }
    const sheet = this.logSheet;
    for (const k in logIndexCache) delete logIndexCache[k];
    const allData = sheet.getRange('A2:B101').getValues();
    const jsonCol = 2;
    if (!trip?.id) {
      Logger.log('❌ Missing trip ID.');
      return;
    }
    const normalizedDate = Utils.formatDateString(trip.date || '');
    let rowIndex = -1;
    let tripsMap = new Map();
    if (normalizedDate === '') {
      rowIndex = 0;
      try {
        tripsMap = deserializeTripMap(allData[0]?.[1]);
      } catch (e) {
        Logger.log('⚠️ Could not parse JSON in B2.');
        tripsMap = new Map();
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
          tripsMap = deserializeTripMap(allData[rowIndex][1]);
        } catch (e) {
          Logger.log('⚠️ Could not parse JSON in row ' + (rowIndex + 2));
          tripsMap = new Map();
        }
      } else {
        sheet.appendRow([normalizedDate, '{}']);
        rowIndex = sheet.getLastRow() - 2;
        tripsMap = new Map();
      }
    }
    tripsMap.set(trip.id, trip);
    sheet.getRange(rowIndex + 2, jsonCol).setValue(serializeTripMap(tripsMap));

    // update cache for this date
    logIndexCache[normalizedDate] = rowIndex;
  }

  getTripsByDate(dateStr) {
    const sheet = this.logSheet;

    if (logIndexCache.hasOwnProperty(dateStr)) {
      const row = logIndexCache[dateStr];
      const json = sheet.getRange(row + 2, 2).getValue();
      if (!json) return [];
      return this.logManager.jsonToTrips(json);
    }

    const last = sheet.getLastRow();
    const data = sheet.getRange(2, 1, last - 1, 2).getValues();

    for (let i = 0; i < data.length; i++) {
      const rowDate = Utils.formatDateString(data[i][0]);
      if (rowDate === dateStr) {
        logIndexCache[dateStr] = i;
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
        const trips = this.logManager.jsonToTrips(row[1]);
        all.push(...trips);
      } catch (e) {
        Logger.log('⚠️ Error reading JSON from row.');
      }
    });
    return all;
  }

  updateTripInLog(trip) {
    const sheet = this.logSheet;
    for (const k in logIndexCache) delete logIndexCache[k];
    const allData = sheet.getRange('A2:B101').getValues();
    const jsonCol = 2;
    if (!trip?.id) return;
    trip.time = this.normalizeTimeString(trip.time);
    if (trip.standingOrder && trip.standingOrder.returnTime) {
      trip.standingOrder.returnTime = this.normalizeTimeString(trip.standingOrder.returnTime);
    }
    const normalizedDate = Utils.formatDateString(trip.date || '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newDate = trip.date ? new Date(...normalizedDate.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v))) : new Date(today);
    let sourceRowIndex = -1;
    let sourceTripsMap = new Map();
    let sourceDateKey = null;
    for (let i = 0; i < allData.length; i++) {
      const rowDate = allData[i][0];
      const cellValue = allData[i][1];
      try {
        const tripsMap = deserializeTripMap(cellValue);
        if (tripsMap.has(trip.id)) {
          sourceRowIndex = i;
          sourceTripsMap = tripsMap;
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
      sourceTripsMap.set(trip.id, trip);
      sheet.getRange(sourceRowIndex + 2, jsonCol).setValue(serializeTripMap(sourceTripsMap));
      return;
    }
    if (!isUndated && isFutureOrToday) {
      sourceTripsMap.delete(trip.id);
      sheet.getRange(sourceRowIndex + 2, jsonCol).setValue(serializeTripMap(sourceTripsMap));
      let targetRowIndex = allData.findIndex(row => {
        const rowDate = row[0];
        if (!rowDate) return false;
        const formatted = Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        return formatted === normalizedDate;
      });
      if (targetRowIndex !== -1) {
        let targetTripsMap = new Map();
        try {
          targetTripsMap = deserializeTripMap(allData[targetRowIndex][1]);
        } catch (e) {
          Logger.log('⚠️ Could not parse JSON at target row ' + (targetRowIndex + 2));
        }
        targetTripsMap.set(trip.id, trip);
        sheet.getRange(targetRowIndex + 2, jsonCol).setValue(serializeTripMap(targetTripsMap));
      } else {
        sheet.appendRow([normalizedDate, serializeTripMap(new Map([[trip.id, trip]]))]);
      }
      return;
    }
    if (isUndated) {
      let undatedTripsMap = new Map();
      try {
        undatedTripsMap = deserializeTripMap(sheet.getRange(2, jsonCol).getValue());
      } catch (e) {
        Logger.log('⚠️ Could not parse undated trip JSON at B2');
      }
      sourceTripsMap.delete(trip.id);
      sheet.getRange(sourceRowIndex + 2, jsonCol).setValue(serializeTripMap(sourceTripsMap));
      undatedTripsMap.set(trip.id, trip);
      sheet.getRange(2, jsonCol).setValue(serializeTripMap(undatedTripsMap));
    }
  }

  deleteTripFromLog(id, date) {
    const sheet = this.logSheet;
    for (const k in logIndexCache) delete logIndexCache[k];
    const allData = sheet.getRange('A2:B101').getValues();
    const jsonCol = 2;
    if (!id) return;
    const isUndated = !date || String(date).trim() === '';
    const targetDate = isUndated ? '' : Utils.formatDateString(date);
    let rowIndex = -1;
    let tripsMap = new Map();
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
      tripsMap = deserializeTripMap(range.getValue());
    } catch (e) {
      Logger.log('⚠️ Could not parse existing JSON in row ' + (rowIndex + 2));
      return;
    }
    const tripToDelete = tripsMap.get(id);
    tripsMap.delete(id);
    if (tripToDelete) {
      const originalId = tripToDelete.id;
      for (const [tid, t] of Array.from(tripsMap.entries())) {
        if ((t.returnOf || '') === originalId) {
          tripsMap.delete(tid);
        }
      }
    }
    range.setValue(serializeTripMap(tripsMap));
  }

  deleteStandingOrder(standingOrder) {
    if (!standingOrder) return;
    const allTrips = this.getAllTrips();
    const target = JSON.stringify(standingOrder);
    allTrips.forEach(trip => {
      const obj = Array.isArray(trip) ? this.logManager.rowToTrip(trip) : trip;
      const st = JSON.stringify(obj.standingOrder || {});
      if (st === target) {
        this.deleteTripFromLog(obj.id, obj.date);
      }
    });
  }

  deleteStandingOrderOnDates(standingOrder, dates) {
    if (!standingOrder || !Array.isArray(dates)) return;
    const normalizedDates = dates.map(d => Utils.formatDateString(d));
    const allTrips = this.getAllTrips();
    const target = JSON.stringify(standingOrder);
    allTrips.forEach(trip => {
      const obj = Array.isArray(trip) ? this.logManager.rowToTrip(trip) : trip;
      console.log(
        obj,
        JSON.stringify(obj.standingOrder || {}),
        target,
        Utils.formatDateString(obj.date),
        JSON.stringify(obj.standingOrder || {}) === target &&
          normalizedDates.includes(Utils.formatDateString(obj.date))
      );
      if (
        JSON.stringify(obj.standingOrder || {}) === target &&
        normalizedDates.includes(Utils.formatDateString(obj.date))
      ) {
        this.deleteTripFromLog(obj.id, obj.date);
      }
    });
  }
}

const tripManager = new TripManager(spreadsheetService, logManager);

function addTripToLog(trip) { return tripManager.addTripToLog(trip); }
function getTripsByDate(dateStr) { return tripManager.getTripsByDate(dateStr); }
function getTripById(encodedId, date) { return tripManager.getTripById(encodedId, date); }
function getAllTrips() { return tripManager.getAllTrips(); }
function updateTripInLog(trip) { return tripManager.updateTripInLog(trip); }
function deleteTripFromLog(id, date) { return tripManager.deleteTripFromLog(id, date); }
function deleteStandingOrder(standingOrder) { return tripManager.deleteStandingOrder(standingOrder); }
function deleteStandingOrderOnDates(standingOrder, dates) { return tripManager.deleteStandingOrderOnDates(standingOrder, dates); }
