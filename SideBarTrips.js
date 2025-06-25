function openPassengerTripList(date) {
  const template = HtmlService.createTemplateFromFile('TripsPage');
  template.initialDate = date ?? new Date().toISOString().split("T")[0]; // fallback to today

  const html = template.evaluate()
    .setTitle('Passenger Trips')
    .setWidth(400);

  SpreadsheetApp.getUi().showSidebar(html);
}


function showAddTripSidebar(date) {
  const template = HtmlService.createTemplateFromFile('AddTripPage');
  template.initialDate = date || new Date().toISOString().split("T")[0]; // fallback to today

  const html = template.evaluate()
  .setTitle('Add Trip')
  .setWidth(400);
  
  SpreadsheetApp.getUi().showSidebar(html);
}

function openEditTripSidebar(id) {
  const trip = getTripById(id);
  const html = HtmlService.createHtmlOutputFromFile("EditTripPage")
    .setTitle("Edit Trip")
    .setWidth(400);

  SpreadsheetApp.getUi().showSidebar(html);
  return trip; // Called via `google.script.run.withSuccessHandler()`
}

function showEditTripSidebar(id, date) {
  const template = HtmlService.createTemplateFromFile('EditTripPage');
  template.tripId = id;
  template.tripDate = date;
  const html = template.evaluate()
    .setTitle("Edit Trip")
    .setWidth(400);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showRestoreDatePicker() {
 const html = HtmlService.createHtmlOutputFromFile("DatePicker")
    .setWidth(300)
    .setHeight(180);
  SpreadsheetApp.getUi().showModalDialog(html, "📅 Restore Snapshot");
}




function testOnEdit() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DISPATCH");
  const editedRow = 88;   // Row with the trip
  const editedCol = 21;   // U = Driver column (being watched)

  const range = sheet.getRange(editedRow, editedCol);
  const e = {
    range,
    source: SpreadsheetApp.getActiveSpreadsheet()
  };

  onDispatchSheetEdit(e); // or onDispatchSheetEdit(e) if that's your named trigger
}


function onDispatchSheetEdit(e) {
  try {
    const sheet = e.source.getSheetByName("DISPATCH");
    if (!sheet) return;

    const watchedCols = [1, 3, 4, 5, 10, 12, 13, 15, 17, 21, 25];
    const editedRanges = e?.rangeList?.getRanges() || [e.range]; // Fallback for single range

    for (const range of editedRanges) {
      const col = range.getColumn();
      const row = range.getRow();

      if (row < 2 || !watchedCols.includes(col)) continue;

      const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
      const id = rowData[23]; // Column X = 24th index (0-based)

      if (!id) {
        Logger.log("⛔ Trip ID not found on row " + row);
        continue;
      }

      const trip = dispatchRowToTripObject(rowData);
      if (!trip?.id) {
        Logger.log("⚠️ Invalid trip object on row " + row);
        continue;
      }

      Logger.log("🔄 Syncing trip " + trip.id + " from DISPATCH → LOG");
      updateTripInLog(trip);
    }
  } catch (err) {
    Logger.log("❌ onChange error: " + err.message);
  }
}



// =============================================
//                 CRUD
// =============================================

// CREATE 
function addTripToLog(trip) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LOG");
  const allData = sheet.getRange("A2:B101").getValues(); 
  const jsonCol = 2;

  if (!trip?.id) {
    Logger.log("❌ Missing trip ID.");
    return;
  }

  const normalizedDate = trip.date ? formatDateString(trip.date) : "";
  Logger.log("📅 Date: " + normalizedDate);
  Logger.log("🆔 ID: " + trip.id);

  let rowIndex = -1;
  let trips = [];

  if (normalizedDate === "") {
    // Undated trips always go to row 2 (A2:B2)
    rowIndex = 0;
    try {
      trips = JSON.parse(allData[0]?.[1] || "[]");
    } catch (e) {
      Logger.log("⚠️ Could not parse JSON in B2.");
      trips = [];
    }
  } else {
    // Look for a dated row
    rowIndex = allData.findIndex(row => {
      const rowDate = row[0];
      if (!rowDate) return false;
      const formatted = Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), "yyyy-MM-dd");
      return formatted === normalizedDate;
    });

    if (rowIndex !== -1) {
      try {
        trips = JSON.parse(allData[rowIndex][1] || "[]");
      } catch (e) {
        Logger.log("⚠️ Could not parse JSON in row " + (rowIndex + 2));
        trips = [];
      }
    } else {
      // Append a new row with this date
      sheet.appendRow([normalizedDate, "[]"]);
      rowIndex = sheet.getLastRow() - 2;
    }
  }

  const newRow = tripObjectToRowArray(trip);

  // Remove duplicate by ID
  trips = trips.filter(t => t[23] !== trip.id);
  trips.push(newRow);

  const sorted = sortTripsByTime(trips);

  sheet.getRange(rowIndex + 2, jsonCol).setValue(JSON.stringify(sorted));
}


// READ 
function getTripsByDate(dateStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LOG');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowDate = formatDateString(data[i][0]);
    if (rowDate === dateStr) {
      const jsonStr = data[i][1]; // assuming Column B (index 1) is used for JSON
      if (!jsonStr) return [];

      const trips = convertRawData(jsonStr);
      return trips;
    }
  }

  return [];
}


function getTripById(encodedId, date) {
  const id = decodeURIComponent(encodedId);  // Important fix

  const allData = getTripsByDate(date)
  const row = allData.find(row => {
    const rowId = row.id;
    if (!rowId) return false;

    return id === rowId;
  });

  return row || {};
}

function getAllTrips() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LOG");
  const data = sheet.getRange("A2:B").getValues();
  const all = [];

  data.forEach(row => {
    try {
      const trips = JSON.parse(row[1] || "[]");
      all.push(...trips);
    } catch (e) {
      Logger.log("⚠️ Error reading JSON from row.");
    }
  });

  return all;
}


// UPDATE TRIP
function updateTripInLog(trip) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LOG");
  const allData = sheet.getRange("A2:B101").getValues(); // Rows 2 through 101
  const jsonCol = 2;

  if (!trip?.id) return;

  const normalizedDate = trip.date ? formatDateString(trip.date) : "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const newDate = trip.date
    ? new Date(...normalizedDate.split("-").map((v, i) => i === 1 ? Number(v) - 1 : Number(v)))
    : new Date(today); // fallback — ignored for undated

  const updatedRow = tripObjectToRowArray(trip);

  // === STEP 1: Find source row where this trip ID currently lives ===
  let sourceRowIndex = -1;
  let sourceTrips = [];
  let sourceDateKey = null;

  for (let i = 0; i < allData.length; i++) {
    const rowDate = allData[i][0];
    const cellValue = allData[i][1];

    try {
      const trips = JSON.parse(cellValue || "[]");
      if (trips.some(t => t[23] === trip.id)) {
        sourceRowIndex = i;
        sourceTrips = trips;
        sourceDateKey = rowDate
          ? Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), "yyyy-MM-dd")
          : ""; // If undated, use empty string
        break;
      }
    } catch (e) {
      Logger.log("⚠️ Error parsing JSON in row " + (i + 2));
    }
  }

  if (sourceRowIndex === -1) return;

  const isSameDate = sourceDateKey === normalizedDate;
  const isUndated = normalizedDate === "";
  const isFutureOrToday = newDate >= today;

  // === CASE 1: Same row (including undated) — update in-place ===
  if (isSameDate) {
    const updatedTrips = sortTripsByTime(
      sourceTrips.map(t => (t[23] === trip.id ? updatedRow : t))
    );
    sheet.getRange(sourceRowIndex + 2, jsonCol).setValue(JSON.stringify(updatedTrips));
    return;
  }

  // === CASE 2: Different date — move trip ===
  if (!isUndated && isFutureOrToday) {
    // Remove from old location
    const filtered = sourceTrips.filter(t => t[23] !== trip.id);
    sheet.getRange(sourceRowIndex + 2, jsonCol).setValue(JSON.stringify(filtered));

    // Look for new date row
    let targetRowIndex = allData.findIndex(row => {
      const rowDate = row[0];
      if (!rowDate) return false;
      const formatted = Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), "yyyy-MM-dd");
      return formatted === normalizedDate;
    });

    if (targetRowIndex !== -1) {
      let targetTrips = [];
      try {
        targetTrips = JSON.parse(allData[targetRowIndex][1] || "[]");
      } catch (e) {
        Logger.log("⚠️ Could not parse JSON at target row " + (targetRowIndex + 2));
      }
      targetTrips.push(updatedRow);
      const sorted = sortTripsByTime(targetTrips);
      sheet.getRange(targetRowIndex + 2, jsonCol).setValue(JSON.stringify(sorted));
    } else {
      // Append a new row with date + trip
      sheet.appendRow([normalizedDate, JSON.stringify([updatedRow])]);
    }
    return;
  }

  // === CASE 3: Move to undated (row 2) ===
  if (isUndated) {
    let undatedTrips = [];
    try {
      undatedTrips = JSON.parse(sheet.getRange(2, jsonCol).getValue() || "[]");
    } catch (e) {
      Logger.log("⚠️ Could not parse undated trip JSON at B2");
    }

    // Remove from old location
    const filtered = sourceTrips.filter(t => t[23] !== trip.id);
    sheet.getRange(sourceRowIndex + 2, jsonCol).setValue(JSON.stringify(filtered));

    // Add to undated (B2)
    undatedTrips.push(updatedRow);
    const sorted = sortTripsByTime(undatedTrips);
    sheet.getRange(2, jsonCol).setValue(JSON.stringify(sorted));
  }
}

// DELETE
function deleteTripFromLog(id, date) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LOG");
  const allData = sheet.getRange("A2:B101").getValues(); // ✅ Limit to row 101 (row 2 to 101)
  const jsonCol = 2;

  if (!id) return;

  const isUndated = !date || String(date).trim() === "";
  const targetDate = isUndated ? "" : formatDateString(date);

  let rowIndex = -1;
  let trips = [];

  // === Locate matching row in LOG sheet
  for (let i = 0; i < allData.length; i++) {
    const rowDate = allData[i][0];
    const formattedDate = rowDate
      ? Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), "yyyy-MM-dd")
      : "";

    if (formattedDate === targetDate) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) return;

  const range = sheet.getRange(rowIndex + 2, jsonCol); // +2 to offset header

  try {
    trips = JSON.parse(range.getValue() || "[]");
  } catch (e) {
    Logger.log("⚠️ Could not parse existing JSON in row " + (rowIndex + 2));
    return;
  }

  let tripToDelete = null;

  // Remove the trip by id
  trips = trips.filter(trip => {
    const tripId = Array.isArray(trip) ? trip[23] : trip.id;
    if (tripId === id) {
      tripToDelete = trip;
      return false;
    }
    return true;
  });

  // If it’s an original trip, remove its return trip too
  if (tripToDelete && Array.isArray(tripToDelete)) {
    const originalId = tripToDelete[23];
    trips = trips.filter(trip => {
      const returnOf = trip[30] || "";
      return returnOf !== originalId;
    });
  }

  const sorted = sortTripsByTime(trips);
  range.setValue(JSON.stringify(sorted));
}






