class Utils {
  static formatDateString(date) {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-').map(Number);
      return Utilities.formatDate(new Date(y, m - 1, d), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    const parsed = new Date(date);
    return isNaN(parsed)
      ? (typeof date === 'string' ? date : '')
      : Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  /**
   * Generate a deterministic Trip ID using a salted SHA-256 hash of key fields.
   * @param {Object} fields Object with date, time, passenger, phone, pickup and dropoff
   * @return {string} Hex encoded SHA-256 digest
   */
  static generateTripId({ date = '', time = '', passenger = '', phone = '', pickup = '', dropoff = '' } = {}) {
    const salt = 'AGMT_TRIP_SALT';
    const str = [date, time, passenger, phone, pickup, dropoff].join('|');
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + str);
    return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
  }
}

const utils = Utils;

function TRIP_ID(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== "DISPATCH") return;

  const editedCol = e.range.getColumn();
  const editedRow = e.range.getRow();

  // We only care if Column D (Passenger Name) is edited
  if (editedCol !== 4 || editedRow < 2) return;

  const name = sheet.getRange(editedRow, 4).getValue();      // Column D
  const tripIdCell = sheet.getRange(editedRow, 11);          // Column K
  const existingTripId = tripIdCell.getValue();

  if (name && !existingTripId) {
    const newTripId = Utilities.getUuid();
    tripIdCell.setValue(newTripId);
  }
}

function generateTripIDs_K2toK100() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DISPATCH");
  const rangeStart = 2;
  const rangeEnd = 100;

  const names = sheet.getRange(rangeStart, 4, rangeEnd - 1, 1).getValues(); // Column D
  const ids = sheet.getRange(rangeStart, 11, rangeEnd - 1, 1).getValues();  // Column K

  for (let i = 0; i < names.length; i++) {
    const name = (names[i][0] || "").toString().trim();
    const currentId = (ids[i][0] || "").toString().trim();

    if (name && !currentId) {
      sheet.getRange(i + rangeStart, 11).setValue(Utilities.getUuid());
    }
  }

  Logger.log("TripIDKEYs generated in K2:K100 where needed.");
}
