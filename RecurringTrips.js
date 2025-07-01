// Object-oriented utilities for optimized recurring trip management.

class StandingOrderManager {
  constructor(service) {
    this.service = service || spreadsheetService;
  }

  get logSheet() {
    return this.service.getSheet('Dispatcher', 'LOG');
  }

  /**
   * Create recurring trips across multiple dates.
   * @param {[string, Array]} parentTrip [tripId, fieldsArray]
   * @param {string[]} datesToCreate Array of date strings (yyyy-MM-dd)
   */
  createAcrossDatesFast(parentTrip, datesToCreate) {
    if (!parentTrip || !Array.isArray(parentTrip) || parentTrip.length < 2) return;
    if (!Array.isArray(datesToCreate) || datesToCreate.length === 0) return;

    const logSheet = this.logSheet;
    if (!logSheet) return;

    const parentFields = parentTrip[1];
    const recurringId = parentFields[11];
    const tripKeyID = parentFields[10];
    const soMap = tripManager.getStandingOrderMap();
    const standingOrderObj = soMap[tripKeyID] || {};
    soMap[tripKeyID] = standingOrderObj;

    const lastRow = logSheet.getLastRow();
    const data = lastRow > 1 ? logSheet.getRange(2, 1, lastRow - 1, 2).getValues() : [];
    const dateToRow = {};
    for (let i = 0; i < data.length; i++) {
      const d = data[i][0];
      const key = d ? Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
      if (!dateToRow[key]) {
        dateToRow[key] = i + 2; // 1-based row index
      }
    }

    const rowsCache = {};

    const getRowInfo = dateStr => {
      if (!rowsCache[dateStr]) {
        let rowIndex = dateToRow[dateStr];
        if (rowIndex) {
          const json = logSheet.getRange(rowIndex, 2).getValue();
          try {
            const map = deserializeTripMap(json);
            rowsCache[dateStr] = { index: rowIndex, map };
          } catch (e) {
            rowsCache[dateStr] = { index: rowIndex, map: new Map() };
          }
        } else {
          rowIndex = logSheet.getLastRow() + 1;
          logSheet.appendRow([dateStr, '[]']);
          rowsCache[dateStr] = { index: rowIndex, map: new Map() };
          dateToRow[dateStr] = rowIndex;
        }
      }
      return rowsCache[dateStr];
    };

    datesToCreate.forEach(dateStr => {
      const row = getRowInfo(dateStr);
      const newFields = parentFields.slice();
      const newId = Utilities.getUuid();
      newFields[0] = dateStr;
      newFields[11] = newId;
      newFields[31] = recurringId;
      const newTrip = convertRowToTrip(newFields);
      newTrip.id = newId;
      row.map.set(newId, newTrip);

      if (standingOrderObj.withReturnTrip && standingOrderObj.returnTime) {
        const returnFields = parentFields.slice();
        const returnId = Utilities.getUuid();
        returnFields[0] = dateStr;
        returnFields[11] = returnId;
        returnFields[2] = standingOrderObj.returnTime;
        returnFields[9] = parentFields[12];
        returnFields[12] = parentFields[9];
        returnFields[24] = ((returnFields[24] || '') + ' [RETURN TRIP]').trim();
        returnFields[30] = newId;
        returnFields[31] = recurringId;
        const returnTrip = convertRowToTrip(returnFields);
        returnTrip.id = returnId;
        row.map.set(returnId, returnTrip);
      }
    });

    for (const key in rowsCache) {
      const info = rowsCache[key];
      logSheet.getRange(info.index, 1, 1, 2)
        .setValues([[key, serializeTripMap(info.map)]]);
    }
    tripManager.updateStandingOrderMap(soMap);
  }

  /**
   * Delete recurring trip instances from specific dates.
   * @param {string} recurringId Parent tripId stored in fields[31]
   * @param {string[]} datesToDelete Dates to remove (yyyy-MM-dd)
   */
  deleteFromDates(recurringId, datesToDelete) {
    if (!recurringId || !Array.isArray(datesToDelete) || datesToDelete.length === 0) return;

    const logSheet = this.logSheet;
    if (!logSheet) return;

    const lastRow = logSheet.getLastRow();
    const data = lastRow > 1 ? logSheet.getRange(2, 1, lastRow - 1, 2).getValues() : [];
    const dateToRow = {};
    for (let i = 0; i < data.length; i++) {
      const d = data[i][0];
      const key = d ? Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
      if (!dateToRow[key]) {
        dateToRow[key] = i + 2;
      }
    }

    datesToDelete.forEach(dateStr => {
      const rowIndex = dateToRow[dateStr];
      if (!rowIndex) return;
      const cell = logSheet.getRange(rowIndex, 2);
      const json = cell.getValue();
      if (!json) return;
      let map;
      try {
        map = deserializeTripMap(json);
      } catch (e) {
        map = new Map();
      }
      let changed = false;
      Array.from(map.entries()).forEach(([id, trip]) => {
        if (trip && trip.recurringId === recurringId) {
          map.delete(id);
          changed = true;
        }
      });
      if (changed) {
        cell.setValue(serializeTripMap(map));
      }
    });
  }
}

const standingOrderManager = new StandingOrderManager();

function createRecurringTripAcrossDatesFast(parentTrip, datesToCreate) {
  return standingOrderManager.createAcrossDatesFast(parentTrip, datesToCreate);
}

function deleteRecurringTripFromDates(recurringId, datesToDelete) {
  return standingOrderManager.deleteFromDates(recurringId, datesToDelete);
}

