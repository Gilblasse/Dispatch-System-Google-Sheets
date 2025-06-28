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
}

const utils = Utils;

