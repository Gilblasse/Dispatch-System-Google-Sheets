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

/**
 * Custom sheet function used in column K. Generates a TripIDKEY for the
 * current row based on key fields. Usage in Sheets: =TRIP_ID(D2)
 * @param {string} passenger Passenger name from column D
 * @return {string}
 */
function TRIP_ID(passenger) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const row = SpreadsheetApp.getActiveRange().getRow();
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const fields = {
      date: rowData[0],
      time: rowData[2],
      passenger: passenger,
      phone: rowData[6],
      pickup: rowData[9],
      dropoff: rowData[12]
    };
    return Utils.generateTripId(fields);
  } catch (e) {
    Logger.log('TRIP_ID error: ' + e.message);
    return '';
  }
}
