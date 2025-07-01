function validateTripIndexAgainstLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("LOG");
  const indexSheet = ss.getSheetByName("TRIP_INDEX");

  const indexData = indexSheet.getRange("A2:C" + indexSheet.getLastRow()).getValues();

  for (const [tripId, , rowNum] of indexData) {
    try {
      const json = logSheet.getRange(rowNum, 2).getValue();
      const trips = JSON.parse(json || "[]");

      const match = trips.find(t => (Array.isArray(t) ? t[23] : t.id) === tripId);
      if (!match) {
        Logger.log(`❌ ID ${tripId} not found in LOG row ${rowNum}`);
      }
    } catch (e) {
      Logger.log(`⚠️ Error parsing LOG row ${rowNum}: ${e.message}`);
    }
  }

  Logger.log("✅ Validation complete.");
}



// SNAP SHOTS
function deleteTodaysLogsThenUpdateSnapshotDispatchToLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("LOG");
  const logData = logSheet.getRange("A2:B" + logSheet.getLastRow()).getValues();

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

  // Clear JSON (column B) only
  rowsToClear.forEach(row => {
    logSheet.getRange(row, 2).clearContent();
  });

  snapshotDispatchToLog(true);
}



function snapshotDispatchToLog(isAlert = false) {
  const props = PropertiesService.getScriptProperties();
  const last = Number(props.getProperty('lastSnapshotTs') || 0);
  if (!isAlert && Date.now() - last < 5 * 60 * 1000) {
    return false;
  }
  props.setProperty('lastSnapshotTs', Date.now());
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("LOG");
  const dispatchSheet = ss.getSheetByName("DISPATCH");
  const data = dispatchSheet.getRange("A2:Y100").getValues();

  const logRange = logSheet.getRange("A2:B101").getValues(); // Only rows 2–101
  const dateToRow = {};
  const logDataByDate = {};
  let blankRow = null;

  // Map LOG sheet rows by date
  logRange.forEach((row, i) => {
    const dateVal = row[0];
    const key = dateVal === '' || dateVal == null
      ? ''
      : Utilities.formatDate(new Date(dateVal), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    if (key === '' && blankRow === null) blankRow = i + 2;

    dateToRow[key] = i + 2;
    try {
      logDataByDate[key] = deserializeTripMap(row[1]);
    } catch (e) {
      Logger.log('parse error: ' + e.message);
      logDataByDate[key] = new Map();
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

    const tripKeyID = row[10];
    const trip = [...row];
    trip[0] = dateKey || ''; // Keep date format consistent
    trip[2] = time;
    trip[10] = tripKeyID;

    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = new Map();
    if (tripKeyID) groupedByDate[dateKey].set(tripKeyID, trip);
  }

  // Merge and write
  for (const [dateKey, dispatchMap] of Object.entries(groupedByDate)) {
    const rawLogMap = logDataByDate[dateKey] || new Map();
    const logMap = new Map();

    // Ensure existing values are trip objects
    rawLogMap.forEach((val, key) => {
      const trip = Array.isArray(val) ? convertRowToTrip(val) : val;
      logMap.set(key, trip);
    });

    // Merge current dispatch rows as trip objects
    dispatchMap.forEach((arr, tripKeyID) => {
      const trip = Array.isArray(arr) ? convertRowToTrip(arr) : arr;
      logMap.set(tripKeyID, trip);
    });

    const json = serializeTripMap(logMap);
    let row = dateToRow[dateKey];

    try {
      if (dateKey === '') {
        row = 2;
        logSheet.getRange(row, 1).setValue("");
        logSheet.getRange(row, 2).setValue(json);
      } else {
        if (row) {
          logSheet.getRange(row, 2).setValue(json);
        } else {
          const newRow = logSheet.getLastRow() + 1;
          logSheet.getRange(newRow, 1, 1, 2).setValues([[dateKey, json]]);
        }
      }
    } catch (e) {
      Logger.log('write error: ' + e.message);
    }
  }

  if (isAlert) {
    SpreadsheetApp.getUi().alert(`✅ Snapshot was taken of DISPATCH`);
  }

  return true;
}





function restoreDispatchFromLog(date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("LOG");
  const dispatchSheet = ss.getSheetByName("DISPATCH"); // "Copy of DISPATCH"

  // Parse input date safely and set time to noon to avoid UTC date shifting
  const [year, month, day] = date.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day, 12); // noon to prevent UTC mismatch
  const targetDate = Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const logData = logSheet.getRange("A2:B").getValues();
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
    const data = deserializeTripMap(json);
    parsed = Array.from(data.entries()).map(([tripKeyID, v]) => {
      const row = Array.isArray(v) ? v : tripObjectToRowArray(v);
      row[10] = tripKeyID;
      return row;
    });
  } catch (e) {
    SpreadsheetApp.getUi().alert(`❌ Error parsing snapshot JSON for ${targetDate}`);
    return;
  }

  const timezone = Session.getScriptTimeZone(); // e.g., "America/New_York"

  parsed = parsed.map(row => {
    const toCleanTime = val => {
      if (!val || isNaN(new Date(val))) return "";
      const d = new Date(val);
      return new Date(1899, 11, 30, d.getHours(), d.getMinutes());
    };

    row[0] = new Date(year, month - 1, day); // Local midnight (correct)

    // Clean times
    row[1] = toCleanTime(row[1]); // Start Time
    row[2] = toCleanTime(row[2]); // Time
    row[11] = toCleanTime(row[11]); // IN
    row[14] = toCleanTime(row[14]); // OUT

    return row;
  });

  // Clear previous values only, preserve formatting
  dispatchSheet.getRange("A2:Y100").clearContent();

  // Restore the parsed values
  try {
    if (parsed.length > 0) {
      dispatchSheet.getRange(2, 1, parsed.length, parsed[0].length).setValues(parsed);
      dispatchSheet.getRange("J2:J100").setNumberFormat("@STRING@");
      dispatchSheet.getRange("J2:J100").setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

      applyFormulas(dispatchSheet, dispatchSheetFormulas);

      SpreadsheetApp.getUi().alert(`✅ Restored ${parsed.length} rows to DISPATCH from ${targetDate}`);
    } else {
      SpreadsheetApp.getUi().alert(`⚠️ No rows to restore for ${targetDate}`);
    }
  } catch (e) {
    Logger.log('restore error: ' + e.message);
  }
}



function cleanFirstName(rawFirstName) {
  return String(rawFirstName || "")
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-zA-Z\s'-]/g, "")
    .trim();
}

function addToMapArrayIfUnique(map, key, value) {
  const strVal = String(value || "").trim();
  if (!strVal) return;

  if (!map[key]) {
    map[key] = [strVal];
  } else if (!map[key].includes(strVal)) {
    map[key].push(strVal);
  }
}


function migrateAddPassengersToModularCache() {
  const sourceSS = SpreadsheetApp.openById("1oc_ac8XTmjcoUjy0l_vj6m5j4YYVFuRykybSHToDAME");
  const sourceSheet = sourceSS.getSheetByName("ADD PASSENGERS");
  const rows = sourceSheet.getRange("A2:E").getValues(); // [name, medicaid, type, phone, address]

  // Prep containers
  const names = {};
  const phones = {};
  const addresses = {};
  const medicaids = {};
  const types = {};
  const uuids = {};

  rows.forEach(([fullName, medicaid, type, phone, address]) => {
    const nameStr = String(fullName || "").trim();
    if (!nameStr.includes(",")) return;

    const [lastNameRaw, firstNameRaw] = nameStr.split(",");
    const lastName = String(lastNameRaw || "").trim();
    const firstName = cleanFirstName(firstNameRaw);
    if (!firstName || !lastName) return;

    const key = `${lastName.toLowerCase()}, ${firstName.toLowerCase()}`;

    // UUID - only generate once per key
    if (!uuids[key]) {
      uuids[key] = Utilities.getUuid();
    }

    // Names
    names[key] = { firstName, lastName };

    // Reusable field handling
    addToMapArrayIfUnique(phones, key, phone);
    addToMapArrayIfUnique(addresses, key, address);
    addToMapArrayIfUnique(medicaids, key, medicaid);

    // Type (just overwrite)
    if (type) types[key] = String(type).trim();
  });

  // Write all at once
  const cacheSheet = SpreadsheetApp.getActive().getSheetByName("PASSENGER_CACHE");
  cacheSheet.getRange("A2:F2").setValues([[
    JSON.stringify(names),
    JSON.stringify(phones),
    JSON.stringify(addresses),
    JSON.stringify(medicaids),
    JSON.stringify(types),
    JSON.stringify(uuids)
  ]]);

  Logger.log("✅ Migration complete.");
}












function promptRestoreSnapshotByDate() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("📅 Restore Snapshot", "Enter the date to restore (YYYY-MM-DD):", ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const inputDate = response.getResponseText().trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
    ui.alert("❌ Invalid date format. Please use YYYY-MM-DD.");
    return;
  }

  restoreDispatchFromLog(inputDate);
}

function maybeSnapshotDispatchToLog() {
  return snapshotDispatchToLog(false);
}

function backSyncLegacyTripIds() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName('LOG');

    const logRange = logSheet.getRange('A2:B' + logSheet.getLastRow()).getValues();

    logRange.forEach((row, idx) => {
      const json = row[1];
      if (!json) return;

      let map;
      try {
        map = deserializeTripMap(json);
      } catch (e) {
        Logger.log('⚠️ Error parsing LOG row ' + (idx + 2) + ': ' + e.message);
        return;
      }

      // If deserializeTripMap produced an empty map, try legacy array of rows
      if (map.size === 0) {
        try {
          const arr = JSON.parse(json);
          if (Array.isArray(arr)) {
            map = new Map();
            arr.forEach(r => {
              if (!Array.isArray(r)) return;
              const tripKeyID = Utils.generateTripId({
                date: r[0],
                time: r[2],
                passenger: r[3],
                phone: r[6],
                pickup: r[9],
                dropoff: r[12]
              });
              r[10] = tripKeyID;
              map.set(tripKeyID, r);
            });
          }
        } catch (e) {
          Logger.log('⚠️ Error parsing LOG row ' + (idx + 2) + ': ' + e.message);
          return;
        }
      }

      const updatedMap = new Map();
      map.forEach((val, key) => {
        const arr = Array.isArray(val) ? val.slice() : tripObjectToRowArray(val);
        let tripKeyID = key || arr[10];
        if (!tripKeyID || tripKeyID === 'null' || tripKeyID === 'undefined') {
          tripKeyID = Utils.generateTripId({
            date: arr[0],
            time: arr[2],
            passenger: arr[3],
            phone: arr[6],
            pickup: arr[9],
            dropoff: arr[12]
          });
        }
        arr[10] = tripKeyID;
        updatedMap.set(tripKeyID, arr);
      });

      if (updatedMap.size > 0) {
        const newJson = JSON.stringify(Array.from(updatedMap.entries()));
        logSheet.getRange(idx + 2, 2).setValue(newJson);
      }
    });
  } catch (e) {
    Logger.log('❌ Back-sync error: ' + e.message);
  }
}
