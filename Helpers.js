// ==============================================================================
//                           HELPER FUNCTIONS FOR SIDBAR 
// ==============================================================================
// Column index constants are defined in AmazingGraceTransport_constant.js



/**
 * Sorts a list of trip rows by column C (index 2) as time (HH:mm format).
 * Uses a fixed dummy date to ensure consistent and valid Date objects.
 * @param {Array[]} trips - An array of trip rows where index 2 is time string
 * @return {Array[]} Sorted array of trip rows
 */
function sortTripsByTime(trips) {
  return trips.slice().sort((a, b) => {
    const timeA = toTimeOnlySmart(a[2]);
    const timeB = toTimeOnlySmart(b[2]);
    return timeA - timeB;
  });
}

function sortTripObjectsByTime(trips) {
  return trips.slice().sort((a, b) => {
    const timeA = toTimeOnlySmart(a.time || a.startTime);
    const timeB = toTimeOnlySmart(b.time || b.startTime);
    return timeA - timeB;
  });
}

function sortTripMapByTime(map) {
  const sorted = sortTripObjectsByTime(Object.values(map));
  return Object.fromEntries(sorted.map(t => [t.id, t]));
}

/**
 * Serializes a Map of trips to a JSON string. Trips are first ordered by time
 * for consistency, then converted to an array of [key, trip] pairs.
 * @param {Map<string, Object>} map
 * @return {string}
 */
function serializeTripMap(map) {
  if (!(map instanceof Map)) return JSON.stringify([]);
  const entries = Array.from(map.entries());
  entries.sort((a, b) => {
    const timeA = toTimeOnlySmart(a[1].time || a[1].startTime);
    const timeB = toTimeOnlySmart(b[1].time || b[1].startTime);
    return timeA - timeB;
  });
  return JSON.stringify(entries);
}

/**
 * Deserializes a JSON string created by {@link serializeTripMap} back into a
 * Map keyed by the first element of each pair. Falls back gracefully on legacy
 * object/array formats.
 * @param {string} str
 * @return {Map<string, Object>}
 */
function deserializeTripMap(str) {
  const map = new Map();
  if (!str) return map;

  let parsed;
  try {
    parsed = JSON.parse(str);
  } catch (e) {
    return map;
  }

  if (Array.isArray(parsed)) {
    parsed.forEach(item => {
      if (Array.isArray(item) && item.length === 2) {
        map.set(String(item[0]), item[1]);
      }
    });
  } else if (parsed && typeof parsed === 'object') {
    Object.keys(parsed).forEach(k => {
      map.set(String(k), parsed[k]);
    });
  }

  return map;
}

function toTimeOnlySmart(val, { returnMillis = true } = {}) {
  // Handle blank values
  if (!val || (typeof val === "string" && val.trim() === "")) {
    const fallback = new Date(1899, 11, 30, 23, 58); // "11:58 PM"
    return returnMillis ? fallback.getTime() : fallback;
  }

  // ISO 8601 string
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    const d = new Date(val);
    const result = new Date(1899, 11, 30, d.getHours(), d.getMinutes());
    return returnMillis ? result.getTime() : result;
  }

  // "HH:mm"
  if (typeof val === "string" && /^\d{1,2}:\d{2}$/.test(val)) {
    const [h, m] = val.split(":").map(Number);
    const result = new Date(1899, 11, 30, h, m);
    return returnMillis ? result.getTime() : result;
  }

  // Native Date or anything else parsable
  const d = new Date(val);
  if (!isNaN(d)) {
    const result = new Date(1899, 11, 30, d.getHours(), d.getMinutes());
    return returnMillis ? result.getTime() : result;
  }

  // Fallback
  const fallback = new Date(1899, 11, 30, 23, 58);
  return returnMillis ? fallback.getTime() : fallback;
}

function fromDateOnly(val) {
  if (!val || isNaN(new Date(val))) return "";

  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return val;
  }

  const d = new Date(val);
  d.setUTCHours(0, 0, 0, 0);
  return d // return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

function fromTimeOnly(val) {
  if (!val || isNaN(new Date(val))) return "";

  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return val;
  }

  const d = new Date(val);
  const t = new Date(1899, 11, 30, d.getHours(), d.getMinutes()); // ✅ local time
  return t.toISOString(); // if string is truly needed
}

function uiCellFormat(date){
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}


function formatToYMD(dateString) {
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/*
 * TripIDKEY (trip.tripKeyID) is stored in column K (index 10) as a salted
 * SHA-256 hash of date, time, passenger, phone, pickup and dropoff. Snapshot
 * data in the LOG sheet stores trips as JSON:
 * JSON.stringify(Array.from(map.entries())), where each entry is
 * [TripIDKEY, tripArray].
 */
function tripObjectToRowArray(trip) {
  const row = Array(COLUMN.LOG.STANDING_ORDER + 1).fill("");
  row[COLUMN.LOG.DATE] = fromDateOnly(trip.date);
  row[COLUMN.LOG.START_TIME] = toTimeOnlySmart(trip.startTime, { returnMillis: false });
  row[COLUMN.LOG.TIME] = toTimeOnlySmart(trip.time, { returnMillis: false });
  row[COLUMN.LOG.PASSENGER] = trip.passenger || "";
  row[COLUMN.LOG.TRANSPORT] = trip.transport || "";
  row[COLUMN.LOG.PHONE] = trip.phone || "";
  row[COLUMN.LOG.MEDICAID] = trip.medicaid || "";
  row[COLUMN.LOG.INVOICE] = trip.invoice || "";
  row[COLUMN.LOG.PICKUP] = trip.pickup || "";
  row[COLUMN.LOG.TRIP_KEY_ID] = trip.tripKeyID || "";
  row[COLUMN.LOG.IN] = toTimeOnlySmart(trip.in, { returnMillis: false });
  row[COLUMN.LOG.DROPOFF] = trip.dropoff || "";
  row[COLUMN.LOG.OUT] = toTimeOnlySmart(trip.out, { returnMillis: false });
  row[COLUMN.LOG.STATUS] = trip.status || "";
  row[COLUMN.LOG.VEHICLE] = trip.vehicle || "";
  row[COLUMN.LOG.DRIVER] = trip.driver || "";
  row[COLUMN.LOG.ID] = trip.id || "";
  row[COLUMN.LOG.NOTES] = trip.notes || "";
  row[COLUMN.LOG.RETURN_OF] = trip.returnOf || "";
  row[COLUMN.LOG.RECURRING_ID] = trip.recurringId || "";
  row[COLUMN.LOG.STANDING_ORDER] = JSON.stringify(trip.standingOrder || {});
  return row;
}




function convertRawData(value) {
  const map = deserializeTripMap(value);
  const trips = [];
  map.forEach(val => {
    const row = Array.isArray(val) ? convertRowToTrip(val) : val;
    trips.push(row);
  });
  return trips;
}

function convertRowToTrip(row) {
  return {
    date: Utils.formatDateString(row[COLUMN.LOG.DATE]),
    time: row[COLUMN.LOG.TIME],
    passenger: row[COLUMN.LOG.PASSENGER],
    transport: row[COLUMN.LOG.TRANSPORT],
    phone: row[COLUMN.LOG.PHONE],
    medicaid: row[COLUMN.LOG.MEDICAID],
    invoice: row[COLUMN.LOG.INVOICE],
    pickup: row[COLUMN.LOG.PICKUP],
    dropoff: row[COLUMN.LOG.DROPOFF],
    status: row[COLUMN.LOG.STATUS],
    vehicle: row[COLUMN.LOG.VEHICLE],
    driver: row[COLUMN.LOG.DRIVER],
    recurringId: row[COLUMN.LOG.RECURRING_ID] || "",
    tripKeyID: row[COLUMN.LOG.TRIP_KEY_ID],
    id: row[COLUMN.LOG.ID],
    notes: row[COLUMN.LOG.NOTES],
    returnOf: row[COLUMN.LOG.RETURN_OF] || "",
    standingOrder: (() => { try { return JSON.parse(row[COLUMN.LOG.STANDING_ORDER] || '{}'); } catch (e) { return {}; } })()
  };
}

function dispatchRowToTripObject(row) {
  return {
    tripKeyID: row[COLUMN.DISPATCH.TRIP_KEY_ID],          // K: TripIDKEY
    id: row[COLUMN.DISPATCH.ID],                 // X: Unique trip ID
    date: row[COLUMN.DISPATCH.DATE],                // A: Date
    time: row[COLUMN.DISPATCH.TIME],                // B: Time
    passenger: row[COLUMN.DISPATCH.PASSENGER],           // C: Passenger
    transport: row[COLUMN.DISPATCH.TRANSPORT],           // E: Transport
    phone: row[COLUMN.DISPATCH.PHONE],               // D: Phone
    medicaid: row[COLUMN.DISPATCH.MEDICAID],            // F: Medicaid #
    invoice: row[COLUMN.DISPATCH.INVOICE],             // G: Invoice #
    pickup: row[COLUMN.DISPATCH.PICKUP],              // J: Pick Up
    dropoff: row[COLUMN.DISPATCH.DROPOFF],            // L: Drop Off
    vehicle: row[COLUMN.DISPATCH.VEHICLE],            // M: Vehicle
    driver: row[COLUMN.DISPATCH.DRIVER],             // O: DRIVER
    standingOrder: (() => { try { return JSON.parse(row[COLUMN.DISPATCH.STANDING_ORDER] || '{}'); } catch (e) { return {}; } })(),
    recurringId: row[COLUMN.DISPATCH.RECURRING_ID] || "",  // AF: recurringId
    notes: row[COLUMN.DISPATCH.NOTES],              // Y: Notes
    returnOf: row[COLUMN.DISPATCH.RETURN_OF] || "",     // AE: returnOf (optional)
    status: row[COLUMN.DISPATCH.STATUS] || "",       // Q: Status

  };
}




function updateTripIndex(id, dateKey, rowNum, returnOfId = "") {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TRIP_INDEX");
  const data = sheet.getRange("A2:D" + sheet.getLastRow()).getValues();
  const rowIndex = data.findIndex(row => row[0] === id);

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex + 2, 2, 1, 3).setValues([[dateKey, rowNum, returnOfId]]);
  } else {
    sheet.appendRow([id, dateKey, rowNum, returnOfId]);
  }
}






// ==============================================================================
//                     END OF HELPER FUNCTIONS FOR SIDBAR 
// ==============================================================================


































const zip = (a, b) => a.map((k, i) => [k, b[i]]);
const removeNulls = d => d.filter((e) => e != null );
const removeEmpty = d => d.filter((e) => !isEmpty(e));
const omit = (objct, arr) => Object.entries(objct).reduce((obj,[k,v])=> {
  if(!arr.includes(k)){
    obj[k] = v
  }
  return obj
},{})

const keep = (objct, arr) => Object.entries(objct).reduce((obj,[k,v])=> {
  if(arr.includes(k)){
    obj[k] = v
  }
  return obj
},{})

const isEmpty = s => {
  switch(typeof s){
    case 'object':
      if(s instanceof Date && !isNaN(s.valueOf())){
        return false
      }
      if(s === null){
        return true
      }
      return Object.keys(s).length === 0

    case 'array':
      return s.length === 0 

    default:
      return String(s).trim() === ""
  }
}

isArrofStrings = a =>  {
  if(isEmpty(a)){
    return false
  }
  return a.every(s => typeof s === 'string') 
}

const uniqBy = (arr, k) => {
  let arry = []

  if(typeof k === "string"){
    arry = [k]
  }
  if(typeof k === "object" && Number.isInteger(k?.length)){
    arry = [...k]
  }

  const unique = [...new Set(arr.map(o => {
    return arry.map(key => o[key]).join('')
  }))]
  
  const unqObj = unique.reduce((acc, key)=> {
    if(!acc[key]){
      acc[key] = arr.find(o => {
        return arry.map(ke => o[ke]).join('') === key
      })
    }
    return acc
  },{})

  return Object.values(unqObj)
}


function formatData({dataValues, headers, rowStart, limit, list, isKeep}){
  const data = dataValues.map((arr,rowIdx) => {
      const obj = {}
      
      headers.forEach((h,i) => {
        if(!isEmpty(h)){
          let val = arr[i]
          if(rowStart){
            val = h !== 'rowNum' ? arr[i] : rowStart + rowIdx
          }
          return obj[h] = !isEmpty(val) ? val : null
        }
      })

      const omitedObj = isKeep ? keep(obj,list) : omit(obj,list)
      const isObjEmpty = removeNulls(Object.values(omitedObj)).length >= limit
      return isObjEmpty ? omitedObj : null
    });
    return removeNulls(data)
}


function useSpreadSheet({ssName="Dispatcher", sheetName="DISPATCH"}={ssName: "Dispatcher", sheetName: "DISPATCH"}) {
  const ss = SpreadsheetApp.openById(ssIds[ssName])
  const sheet = ss.getSheetByName(sheetName)

  return {
    ss,
    sheet,
  }
}


function dataFromSheet({cellRange,ssName,sheetName,limit=1,list=[],isKeep=false, isFormatted=true}=dataSheetDefault){
  const rowStart = Number(cellRange.split(':')[0].replace(/[A-Z a-z]/,'')) + 1
  const {sheet} = useSpreadSheet({ssName,sheetName})
  const range = sheet.getRange(cellRange)
  const dataValues = range.getValues()
  const headers = [dataValues.shift(), 'rowNum']

  if(isFormatted){
    return formatData({dataValues, headers, rowStart, limit, list, isKeep})
  }else{
    return {
      headers,
      rows: dataValues,
      rowStart
    }
  }
}


function rowFromSheet({cellRange,ssName,sheetName,limit=1,list=[],isKeep=false, headerRange=null, isFormatted=true}=dataSheetDefault){
  const {sheet} = useSpreadSheet({ssName,sheetName})
  const headers = sheet.getRange(headerRange).getValues()[0]
  const dataValues = sheet.getRange(cellRange).getValues()


  if(isFormatted){
    return formatData({dataValues, headers, limit, list, isKeep})
  }else{
    return {
      headers,
      rows: dataValues,
    }
  }
}


// Optimized Google Apps Script for Sheets "1" through "10"
// === Helper Functions ===

    // sheet.getRange(range).clearContent();
function applyFormulas(sheet, formulas = {}) {
  for (let range in formulas) {
    sheet.getRange(range).setFormula(formulas[range]);
  }
}

function applyHeader(sheet, options = {}) {
  const {
    headerRow,
    range,
    weight = "bold",
    align = "center"
  } = options

   const headerRange = sheet.getRange(range);
    headerRange.setValues(headerRow)
      .setFontWeight(weight)
      .setHorizontalAlignment("center");
}

function applyValidation(sheet, rangeA1, options = {}) {
  const {
    values = [],
    showDropdown = true,
    allowInvalid = false
  } = options;

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, showDropdown)
    .setAllowInvalid(allowInvalid)
    .build();

  sheet.getRange(rangeA1).setDataValidation(rule);
}

function applyAlternateRowColors(sheet, options = {}) {
  const {
    altRanges = ["D6:I30", "L6:L30", "O6:O30"],
    altColors = ["#eef7e3", "#ffffff"]
  } = options;

  altRanges.forEach(rangeStr => {
    const range = sheet.getRange(rangeStr);
    const width = range.getWidth();
    const height = range.getHeight();
    const rowColors = [];

    for (let i = 0; i < height; i++) {
      const color = (i % 2 === 0) ? altColors[1] : altColors[0];
      rowColors.push(width > 1 ? new Array(width).fill(color) : [color]);
    }

    range.setBackgrounds(rowColors);
  });
}

function applyProtections(sheet, me, protectRanges = []) {
  // Remove existing protections on the sheet
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  protections.forEach(p => p.remove());

  // Apply new protections
  protectRanges.forEach(r => {
    const pr = sheet.getRange(r).protect().setDescription('Protected');
    pr.removeEditors(pr.getEditors());
    pr.addEditor(me);
    pr.setWarningOnly(false);
  });
}


function applyVisibilitySettings(sheet, options = {}) {
  const {
    maxVisibleCols = 19,
    alwaysHideCols = ["A", "B", "F", "H", "K", "N", "Q", "R"],
    maxVisibleRows = 30,
    isAutoResize = true,
  } = options;

  sheet.showColumns(1, sheet.getMaxColumns());
  if(isAutoResize) sheet.autoResizeColumns(1, sheet.getMaxColumns());

  const allCols = sheet.getMaxColumns();
  if (allCols > maxVisibleCols) sheet.hideColumns(maxVisibleCols + 1, allCols - maxVisibleCols);
  alwaysHideCols.forEach(col => sheet.hideColumn(sheet.getRange(col + "1")));

  sheet.showRows(1, maxVisibleRows);
  const maxRows = sheet.getMaxRows();
  if (maxRows > maxVisibleRows) sheet.hideRows(maxVisibleRows + 1, maxRows - maxVisibleRows);
}

function applyConditionalFormatting(sheet, groups = [], isClear=false) {
  if(isClear) sheet.clearConditionalFormatRules();

  const makeCFRule = (formula, bg, fg, strike = false) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(formula)
    .setBackground(bg).setFontColor(fg)
    .setStrikethrough(strike).setBold(true);

  const appliedRules = groups.flatMap(group => {
    const formatRanges = group.ranges.map(r => sheet.getRange(r));
    return group.ruleObjs.map(obj =>
      makeCFRule(obj.formula, obj.bg, obj.fg, obj.strike).setRanges(formatRanges)
    );
  });

  sheet.setConditionalFormatRules(appliedRules);
}

function applyFormattingAndBorders(sheet, rangeA1) {
  const range = sheet.getRange(rangeA1);
  range.setBorder(true, true, true, true, true, true);
}


// ======================================  ADD NEW ADDRESS  ====================================
function addNewAddress(){
  
  copyPassenger();
  clearNewAddress();
  sortPassengers();
}


function copyPassenger() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet1 = ss.getSheetByName("DISPATCH");
  var sheet2 = ss.getSheetByName("ADD PASSENGERS");

  sheet1.getRange("E53:I53").copyTo(sheet2.getRange(sheet2.getLastRow()+1,1,1,7), {contentsOnly:true});
 
 }


function clearNewAddress(){
  var app = SpreadsheetApp;
  var activeSheet = app.getActiveSpreadsheet().getSheetByName("DISPATCH");
  activeSheet.getRange("I53").clearContent();
}




function sortPassengers() {
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet= ss.getSheetByName("ADD PASSENGERS");
  var range = sheet.getRange("A:F");
  
 range.sort([{column: 1, ascending: true}]);
  
  migratePassengersToLog()
}





//======================  Adding New Passenger  ====================================

function addNewPassenger(){
  
  copyNewPassenger();
  clearNewPassenger();
  sortPassengers2();
 }


function copyNewPassenger() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet1 = ss.getSheetByName("DISPATCH");
  var sheet2 = ss.getSheetByName("ADD PASSENGERS");

  sheet1.getRange("E55:I55").copyTo(sheet2.getRange(sheet2.getLastRow()+1,1,1,7), {contentsOnly:true});
  
 }

function clearNewPassenger(){
  var app = SpreadsheetApp;
  var activeSheet = app.getActiveSpreadsheet().getActiveSheet();
  activeSheet.getRange("E55:I55").clearContent();
  
}


function sortPassengers2() {
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet= ss.getSheetByName("ADD PASSENGERS");
  var range = sheet.getRange("A:E");
  
 range.sort([{column: 1, ascending: true}]);
  
 }





//----------------------------------  FIXES ALL FORMULAS EXCEPT formula in Status Column Q2:Q50______________________________            UPDATE RANGE TO 100  !!!

function fixIt(){
 var ui = SpreadsheetApp.getUi();
 var response = ui.alert('YES = "Fixs Dispatch and Drivers app"', 'NO = "Fixs Only Dispatch"',ui.ButtonSet.YES_NO_CANCEL);
// var finished = ui.alert('COMPLETED', ui.Button.OK);

 // Process the user's response.
 if (response == ui.Button.NO) {
   fixDispatch();
   fixAddress();
//   fixPassengerDropDown11();
   
   Logger.log('The user\'s name is %s.', response.NO);
 } else if (response == ui.Button.YES) {
   fixDispatch();
   fixDrivers();
   fixAddress();
//   fixPassengerDropDown11();
   
//   Logger.log('The user\'s name is %s.', response.YES);
 } else {
   Logger.log('The user clicked the close button in the dialog\'s title bar.');
 }
}




function fixPassengerDropDown(){
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DISPATCH');
  var sss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ADD PASSENGERS');
  var range = ss.getRange("A2:Y100");
  var rules = range.getDataValidation();
  
  
  for(var i=1; i<=range.getValues().length; i++){
    
      
    
      var rowCell = range.getCell(i, 4);
      var validationRule = SpreadsheetApp.newDataValidation().requireValueInRange(sss.getRange("A2:A")).build();
         
         rowCell.setDataValidation(validationRule);
         rowCell.setDataValidation(validationRule);             
     };
  };




function fixPassengerDropDown11(){
 var ui = SpreadsheetApp.getUi();
 var response = ui.alert('FIX ERRORS IN PASSENGER DROPDOWN', 'Would You Like To Proceed?',ui.ButtonSet.YES_NO);
// var finished = ui.alert('COMPLETED', ui.Button.OK);

 // Process the user's response.
 if (response == ui.Button.NO) {   
   Logger.log('The user\'s name is %s.', response.NO);
   
 } else if (response == ui.Button.YES) {
   fixPassengerDropDown();
   
 } else {
   Logger.log('The user clicked the close button in the dialog\'s title bar.');
 }
}





function fixAddress(){
 var ui = SpreadsheetApp.getUi();
 var response = ui.alert('Would you Also like to Fix Address Errors', 'Would You Like To Proceed?',ui.ButtonSet.YES_NO);
// var finished = ui.alert('COMPLETED', ui.Button.OK);

 // Process the user's response.
 if (response == ui.Button.NO) {   
   Logger.log('The user\'s name is %s.', response.NO);
   
 } else if (response == ui.Button.YES) {
   rowAddressValidation();
   
 } else {
   Logger.log('The user clicked the close button in the dialog\'s title bar.');
 }
}


function countMe(){
//  var currentValue = PropertiesService.getScriptProperties().getProperty('mapItCount');
//  var count = Number(currentValue) + 1;
//  
//  PropertiesService.getScriptProperties().setProperty('mapItCount', count);
}

function eStatusCol(){
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DISPATCH");
  var statusCol = ss.getRange("Q2:Q100");
  
  var E2 = 'E2=';
  var comma = ","
  var begin = '=iferror(IFS(';
  var part1 = '"REASSIGN"';
  var part2 = '"COMPLETE"';
  var part3 = '"CANCEL"';
  var part4 = '"UPDATE TIME"';
  var part5 = '"READY"';
  var part6 = '"NOT CONFIRMED"';
  var part7 = 'E2=""';
  var find = `INDEX('drivers data linked'!$A$2:$O$${driversDataLinkedRangeHeight},MATCH(X2,'drivers data linked'!$O$2:$O$${driversDataLinkedRangeHeight},0),MATCH($Q$1,'drivers data linked'!$A$1:$O$1,0))`;
  var endingMarks = '"")';
  
  var startBuild = begin+E2+part1+comma+part1+comma+E2+part2+comma+part2+comma+E2+part3+comma+part3+comma+E2+part4+comma;
  var finishBuild = startBuild+find+comma+E2+part5+comma+find+comma+E2+part6+comma+find+comma+part7+comma+find+'),"")';

  statusCol.setFormula(finishBuild);
}

function formatPhoneForLink(phone) {
  if (!phone) return '';
  return phone.toString().replace(/[^\d]/g, '');
}

function styleHeaderRow(options = {}) {
  const {
    weight = "bold",
    backgroundColor = "#8bc34a",
    textColor = "#434343",
  } = options

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getRange(1, 1, 1, sheet.getLastColumn()); // First row

  range.setFontWeight(weight)
       .setBackground(backgroundColor)
       .setFontColor(textColor);
}



function fixDispatch(sheetName="DISPATCH") {
  const me = Session.getEffectiveUser();
  var currentValue = PropertiesService.getScriptProperties().getProperty('fixDispatchCount');
  var count = Number(currentValue) + 1;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var marks = '"")';
  var ranges = [["F2:F100"],["G2:G100"],["H2:H100"],["L2:L100"],["O2:O100"],
                ["S2:S100"],["T2:T100"],["V2:V100"],["W2:W100"],["X2:X100"],
                ["N2:N100"],["A2:A100"],["B2:C100"]
               ];
  
  var formulas = [
    ["=IFERROR(VLOOKUP(D2,'ADD PASSENGERS'!$A$2:$E,3,false),"],
    ["=IFERROR(VLOOKUP(D2,'ADD PASSENGERS'!$A$2:$E,4,false),"],
    ["=IFERROR(VLOOKUP(D2,'ADD PASSENGERS'!$A$2:$E,2,false),"],
    [`=IFERROR(INDEX('drivers data linked'!$A$2:$O$${driversDataLinkedRangeHeight},MATCH(X2,'drivers data linked'!$O$2:$O$${driversDataLinkedRangeHeight},0),MATCH($L$1,'drivers data linked'!$A$1:$O$1,0)),`],
    [`=IFERROR(INDEX('drivers data linked'!$A$2:$O$${driversDataLinkedRangeHeight},MATCH(X2,'drivers data linked'!$O$2:$O$${driversDataLinkedRangeHeight},0),MATCH($O$1,'drivers data linked'!$A$1:$O$1,0)),`],
    ["=IFERROR(VLOOKUP(R2,vehicles!$C$2:$E$50,3,0),"],
    ["=IFERROR(VLOOKUP(R2,vehicles!$C$2:$F$50,4,0),"],
    ["=IFERROR(VLOOKUP(U2,drivers!$A$2:$C$14,2,0),"],
    ["=IFERROR(VLOOKUP(U2,drivers!$A$2:$C$14,3,false),"],
    ['=IF(D2="","", U2&"|"&A2&"|"&C2&"|"&D2&"|"&J2)'],
    ['=IF(M2="","",HYPERLINK("http://maps.google.com/maps/dir/"&J2&"/"&M2,char(9970)))'],
  ];
  PropertiesService.getScriptProperties().setProperty('fixDispatchCount', count);

  eStatusCol();
  
  ss.getRange(ranges[11][0]).setNumberFormat("M/d"); // COL A
  ss.getRange(ranges[12][0]).setNumberFormat("h:mm AM/PM"); // COL B-C
 
  for (var i=0; i<=10; ++i){ 
    var selectedRange = ss.getRange(ranges[i][0]); 
    var selectedFormula = formulas[i][0]+marks;
    
    i==9||i==10 ? selectedRange.setFormula(formulas[i][0]) : selectedRange.setFormula(selectedFormula);
  }

  const conditionalRules1 = [
    { formula: '=$E6="UPDATE TIME"', bg: "#ffffff", fg: "#FF0000" },
  ]
  const conditionalFormatRanges1 = ["C2:C100"]

 
  const conditionalRules2 = [
    { formula: '=$E2="COMPLETE"', bg: "#1e7e34", fg: "#ffffff" },
    { formula: '=$E2="CANCEL"', bg: "#b50000", fg: "#000000", strike: true },
    { formula: '=$E2="NOT CONFIRMED"', bg: "#ffffff", fg: "#bdb7b7" },
    { formula: '=$E2="REASSIGN"', bg: "#ffffff", fg: "#ff17ff", strike: true },
    
    { formula: '=$Q2="COMPLETE"', bg: "#1e7e34", fg: "#ffffff" },
    { formula: '=$Q2="IN ROUTE"', bg: "#FBFF00", fg: "#434343" },
    { formula: '=$Q2="PICK UP LOCATION"', bg: "#FBFF00", fg: "#0000ff" },
    { formula: '=$Q2="IN TRANSIT"', bg: "#FFC626", fg: "#ffffff" },
    { formula: '=$Q2="DROP OFF LOCATION"', bg: "#FFC626", fg: "#0000ff" },
    { formula: '=$Q2="NO SHOW"', bg: "#a0a0a0", fg: "#ffffff" },
    { formula: '=$Q2="CANCEL"', bg: "#b50000", fg: "#000000", strike: true },
    
    { formula: '=$E2="READY"', bg: "#ffffff", fg: "#FF0000" },
    { formula: '=$E2="WAITING"', bg: "#ffffff", fg: "#0000ff" },
  ];

  const conditionalFormatRanges2 = ["A2:Y100"]

  // const protectRanges = [
  //   "F2:H100", "L2:L100", "N2:O100",
  //   "Q2:Q100", "S2:T100", "V2:X100", "1:1"
  // ];

  ss.setFrozenRows(1); // Freezes 1st row
  ss.setFrozenColumns(4); // Freezes A - D

  // === 2. Clear Backgrounds & Set Borders
  applyFormattingAndBorders(ss, "A1:Y100");

  // === 3. Conditional Formatting
  applyConditionalFormatting(ss, [
    { ranges: conditionalFormatRanges1, ruleObjs: conditionalRules1 },
    { ranges: conditionalFormatRanges2, ruleObjs: conditionalRules2 }
  ]);

  // === 4. Alternate Row Colors
  applyAlternateRowColors(ss, {altRanges: ["A2:Y100"]});

  // === 5. Column & Row Visibility
  applyVisibilitySettings(ss, {
    maxVisibleCols: 25,
    alwaysHideCols: ["K", "Q", "S", "T", "V", "W", "X"],
    maxVisibleRows: 100,
    isAutoResize: false
  });

  // === 6. Protection
  // applyProtections(ss, me, protectRanges);

  styleHeaderRow(); // Header color and style
}



// === Main Driver ===
function fixDrivers() {
  const systemSheets = ["Schedule Links", "DATA", "MASTER DRIVERS DATA LINKED", "HOME"];
  const sheetId = "13rpPjV3KOxfQw9W6ARA-KWSkxNI7qy6oqp4fwvlchlA";
  const ss = SpreadsheetApp.openById(sheetId);
  const me = Session.getEffectiveUser();

  const sheets = ss.getSheets();

  // === Shared Resources ===
  const headerRow = [[
    "Begin @", "PU TIME", "Passenger", "Dispatch", "Type", "",
    "Phn", "In", "Pick Up", "Pick Up", "Out",
    "Drop Off", "Drop Off", "STATUS", "SIGNATURE", "ID", "Dispatch"
  ]];

  const statusOptions = [
    "IN ROUTE", "PICK UP LOCATION", "IN TRANSIT", "DROP OFF LOCATION",
    "COMPLETE", "WAITING", "NO SHOW", "CANCEL"
  ];

  const protectRanges = [
      "C1:I30", "K6:L30", "N6:O30",
      "Q6:Q30", "R6:R30", "S6:U30", "1:4"
  ];

  const formulas = {
    "C4": "=HOME!F15",
    "E4": "=DATA!X1",
    "C6:C30": '=IFERROR(VLOOKUP($R6,DATA!$A$2:$C$100,3,FALSE),"")',
    "D6": '=IFERROR(SORT(FILTER(DATA!D2:G100,DATA!B2:B100=E4,DATA!V2:V100=C3),1,TRUE),"")',
    "H6:H30": '=IFERROR(FILTER(DATA!$H$2:$H$100,DATA!$Y$2:$Y$100=R6),"")',
    "I6:I30": `=IFERROR(IF(H6="", "", HYPERLINK("https://call.ctrlq.org/" & TEXTJOIN("", TRUE, ARRAYFORMULA(IFERROR(MID(H6, ROW(INDIRECT("1:" & LEN(H6))), 1) * 1, ""))), "Call")), "")`,
    "K6:K30": '=IFERROR(FILTER(DATA!$K$2:$K$100,DATA!$E$2:$E$100=E6,DATA!$D$2:$D$100=D6,DATA!$B$2:$B$100=$E$4,DATA!$V$2:$V$100=$C$3))',

    "L6:L30": '=IFERROR(IF(K6="","",HYPERLINK("http://maps.google.com/maps?q="&K6,K6)),"")',
    "N6:N30": '=IFERROR(INDEX(FILTER(DATA!$N$2:$N$100, DATA!$E$2:$E$100=E6, DATA!$D$2:$D$100=D6, DATA!$B$2:$B$100=$E$4, DATA!$V$2:$V$100=$C$3), 1), "")',

    "O6:O30": '=IF(N6="","",HYPERLINK("http://maps.google.com/maps?q="&N6,N6))',
    "Q6:Q30": '=IFERROR(INDEX(FILTER(DATA!$E$160:$E$180, DATA!$C$160:$C$180=$C$3), 1), "")',
    "R6:R30": '=IFERROR($C$3&"|"&$E$4&"|"&D6&"|"&E6&"|"&K6,"")',
    "S6:S30": '=IFERROR(VLOOKUP(R6,DATA!$Y$2:$Z$100,2,FALSE),"")',
    "T6:T30": '=IFERROR($C$3&"|"&$E$4&"|"&D6&"|"&E6&"|"&K6,"")',
    "U6:U30": '=IFERROR(VLOOKUP(T6,DATA!$Y$2:$Z$100,2,FALSE),"")'
  };

  const conditionalRules1 = [
    { formula: '=$F6="UPDATE TIME"', bg: "#ffffff", fg: "#FF0000" },
  ]
  const conditionalFormatRanges1 = ["D6:D30"]

  const conditionalRules2 = [
    { formula: '=$F6="COMPLETE"', bg: "#1e7e34", fg: "#ffffff" },
    { formula: '=$F6="CANCEL"', bg: "#b50000", fg: "#000000", strike: true },
    { formula: '=$F6="NOT CONFIRMED"', bg: "#ffffff", fg: "#bdb7b7" },
    { formula: '=$F6="REASSIGN"', bg: "#ffffff", fg: "#ff17ff", strike: true },
    
    { formula: '=$P6="COMPLETE"', bg: "#1e7e34", fg: "#ffffff" },
    { formula: '=$P6="IN ROUTE"', bg: "#FBFF00", fg: "#434343" },
    { formula: '=$P6="PICK UP LOCATION"', bg: "#FBFF00", fg: "#0000ff" },
    { formula: '=$P6="IN TRANSIT"', bg: "#FFC626", fg: "#ffffff" },
    { formula: '=$P6="DROP OFF LOCATION"', bg: "#FFC626", fg: "#0000ff" },
    { formula: '=$P6="NO SHOW"', bg: "#a0a0a0", fg: "#ffffff" },
    { formula: '=$P6="CANCEL"', bg: "#b50000", fg: "#000000", strike: true },
    
    { formula: '=$F6="READY"', bg: "#ffffff", fg: "#FF0000" },
    { formula: '=$P6="WAITING"', bg: "#ffffff", fg: "#0000ff" },
  ];

  const conditionalFormatRanges2 = ["D6:J30", "K6:K30", "L6:Q30", "R19:S30"]


  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (systemSheets.includes(name)) return;
    if (name.startsWith("Sheet")) return ss.deleteSheet(sheet);

    // === 1. Headers
    applyHeader(sheet, { headerRow, range: "C5:S5" });

    // === 1.1 Set Column Widths
    sheet.setColumnWidth(3, 50);   // Column C - Begin @
    sheet.setColumnWidth(4, 50);   // Column D - PU TIME
    sheet.setColumnWidth(5, 100);  // Column E - Passenger (wrapped)
    sheet.setColumnWidth(7, 90);  // Column G - Type (wheelchair/stretchers)
    sheet.setColumnWidth(10, 80);  // Column J - In (time)
    sheet.setColumnWidth(13, 80);  // Column M - Out (time)
    sheet.setColumnWidth(12, 120); // Column L - Pick Up (address)
    sheet.setColumnWidth(15, 120); // Column O - Drop Off (address)
    sheet.setColumnWidth(16, 100); // Column P - STATUS (wrap "Drop Off Location")
    sheet.setColumnWidth(19, 220); // Column S - Dispatch notes (wrap long notes)

    // === 2. Clear Backgrounds & Set Borders
    applyFormattingAndBorders(sheet, "C5:S30");

    // === 3. Alternate Row Colors
    applyAlternateRowColors(sheet);

    // Green fill for specific columns
    const greenColor = "#b7e1cd";
    sheet.getRange("J6:J30").setBackground(greenColor);
    sheet.getRange("M6:M30").setBackground(greenColor);
    sheet.getRange("P6:P30").setBackground(greenColor);

    // === 4. Validation
    applyValidation(sheet, "P6:P30", { values: statusOptions });

    // === 5. Set Formulas
    applyFormulas(sheet, formulas);

    // === 6. Protection
    applyProtections(sheet, me, protectRanges);

    // === 7. Conditional Formatting
    applyConditionalFormatting(sheet, [
      { ranges: conditionalFormatRanges1, ruleObjs: conditionalRules1 },
      { ranges: conditionalFormatRanges2, ruleObjs: conditionalRules2 }
    ]);

    // === 8. Column & Row Visibility
    applyVisibilitySettings(sheet);
  });

  SpreadsheetApp.getUi().alert("Done! All driver sheets have been updated.");
}











//   CONDITIONAL FORMATTING


function conditionalFormatting(){
var rule = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DISPATCH').getConditionalFormatRules()[38];
var ranges = rule.getRanges();

  
  for (var i = 0; i < ranges.length; i++) {
  Logger.log(ranges[i].getA1Notation());
}

}


























