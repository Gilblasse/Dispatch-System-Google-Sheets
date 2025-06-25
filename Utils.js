class Utils {
  static formatDateString(date) {
    if (typeof date === 'string') return date;
    return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
}

const utils = Utils;
