class Utils {
  static formatDateString(date) {
    const parsed = new Date(date);
    if (isNaN(parsed)) {
      return typeof date === 'string' ? date : '';
    }
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
}

const utils = Utils;
