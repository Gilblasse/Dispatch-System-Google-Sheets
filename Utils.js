class Utils {
  static formatDateString(date) {
    if (!date) return '';

    // Return already normalized strings unchanged
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      const [y, m, d] = date.split('-').map(Number);
      const localDate = new Date(y, m - 1, d);
      return Utilities.formatDate(localDate, 'EST', 'yyyy-MM-dd');
    }

    const parsed = new Date(date);
    if (isNaN(parsed)) {
      return typeof date === 'string' ? date : '';
    }

    return Utilities.formatDate(parsed, 'EST', 'yyyy-MM-dd');
  }

  static parseLocalDate(str) {
    if (!str) return new Date(NaN);
    if (str instanceof Date) {
      return new Date(str.getFullYear(), str.getMonth(), str.getDate());
    }
    const parts = String(str).split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      if (![y, m, d].some(isNaN)) {
        return new Date(y, m - 1, d);
      }
    }
    const d = new Date(str);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  static toTimeOnly(val) {
    if (!val) return new Date(NaN);
    const d = new Date(val);
    if (isNaN(d)) return new Date(NaN);
    return new Date(1899, 11, 30, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  }

  static fromTimeOnly(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d)) return '';
    return Utils.toTimeOnly(d).toISOString();
  }

  static timeToString(val) {
    const d = new Date(val);
    if (isNaN(d)) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

const utils = Utils;

