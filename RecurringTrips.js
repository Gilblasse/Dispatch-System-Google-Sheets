// Object-oriented utilities for optimized recurring trip management.

class StandingOrderManager {
  constructor(service = spreadsheetService) {
    this.service = service;
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
    const standingOrder = parentFields[21];

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
            let arr = JSON.parse(json || '[]');
            if (!Array.isArray(arr)) arr = [];
            rowsCache[dateStr] = { index: rowIndex, entries: arr };
          } catch (e) {
            rowsCache[dateStr] = { index: rowIndex, entries: [] };
          }
        } else {
          rowIndex = logSheet.getLastRow() + 1;
          logSheet.appendRow([dateStr, '[]']);
          rowsCache[dateStr] = { index: rowIndex, entries: [] };
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
      newFields[22] = recurringId;
      newFields[21] = standingOrder;
      row.entries.push([newId, newFields]);
    });

    for (const key in rowsCache) {
      const info = rowsCache[key];
      const list = info.entries;
      if (list.length > 2) {
        list.sort((a, b) => {
          const ta = new Date(a[1][2]).getTime();
          const tb = new Date(b[1][2]).getTime();
          return ta - tb;
        });
      }
      logSheet.getRange(info.index, 1, 1, 2).setValues([[key, JSON.stringify(list)]]);
    }
  }

  /**
   * Delete recurring trip instances from specific dates.
   * @param {string} recurringId Parent tripId stored in fields[22]
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
      let arr;
      try {
        arr = JSON.parse(json);
      } catch (e) {
        arr = [];
      }
      if (!Array.isArray(arr)) return;
      const idx = arr.findIndex(item => {
        const fields = item && item[1];
        return fields && fields[22] === recurringId;
      });
      if (idx > -1) {
        arr.splice(idx, 1);
        cell.setValue(JSON.stringify(arr));
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

