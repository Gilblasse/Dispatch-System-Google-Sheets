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
 * Custom formula to generate a UUID once when passenger name is present.
 * Will only generate if input is non-empty and not already a UUID.
 *
 * @param {string} name - Passenger name (usually from column D)
 * @return {string} UUID or empty string
 *
 * Usage: =TRIP_ID(D2)
 */
function TRIP_ID(name) {
  if (!name || typeof name !== 'string' || name.trim() === '') return '';

  // If it's already a UUID (assumes valid UUID format), return it unchanged
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(name.trim())) return name.trim();

  // Otherwise, generate a new UUID
  return Utilities.getUuid();
}
