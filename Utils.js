class Utils {
  static formatDateString(date) {
    if (!date) return '';

    // Return already normalized strings unchanged
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      const [y, m, d] = date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(y, m - 1, d));
      return Utilities.formatDate(utcDate, 'UTC', 'yyyy-MM-dd');
    }

    const parsed = new Date(date);
    if (isNaN(parsed)) {
      return typeof date === 'string' ? date : '';
    }

    const neutral = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
    return Utilities.formatDate(neutral, 'UTC', 'yyyy-MM-dd');
  }
}

const utils = Utils;
