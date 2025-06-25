// ==============================================================================
//                           OOP-STYLE UTILITIES CLASS
// ==============================================================================

class Utilities {
  static cleanFirstName(rawName) {
    if (!rawName) return "";
    return rawName.trim().split(" ")[0];
  }

  static addToMapArrayIfUnique(map, key, value) {
    if (!map[key]) map[key] = [];
    if (!map[key].includes(value)) {
      map[key].push(value);
    }
  }

  static fromDateOnly(val) {
    if (!val || isNaN(new Date(val))) return "";
    const d = new Date(val);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  static fromTimeOnly(val) {
    if (!val || isNaN(new Date(val))) return "";
    const d = new Date(val);
    return new Date(1899, 11, 30, d.getHours(), d.getMinutes()).toISOString();
  }

  static toTimeOnlySmart(val, { returnMillis = true } = {}) {
    if (!val || (typeof val === "string" && val.trim() === "")) {
      const fallback = new Date(1899, 11, 30, 23, 58);
      return returnMillis ? fallback.getTime() : fallback;
    }

    if (typeof val === "string") {
      if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
        const d = new Date(val);
        const result = new Date(1899, 11, 30, d.getHours(), d.getMinutes());
        return returnMillis ? result.getTime() : result;
      }
      if (/^\d{1,2}:\d{2}$/.test(val)) {
        const [h, m] = val.split(":" ).map(Number);
        const result = new Date(1899, 11, 30, h, m);
        return returnMillis ? result.getTime() : result;
      }
    }

    const d = new Date(val);
    if (!isNaN(d)) {
      const result = new Date(1899, 11, 30, d.getHours(), d.getMinutes());
      return returnMillis ? result.getTime() : result;
    }

    const fallback = new Date(1899, 11, 30, 23, 58);
    return returnMillis ? fallback.getTime() : fallback;
  }

  static formatDateString(date) {
    if (typeof date === "string") return date;
    return UtilitiesService.formatDate(new Date(date), Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  static formatToYMD(dateString) {
    const date = new Date(dateString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  static uiCellFormat(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static sortTripsByTime(trips) {
    return trips.slice().sort((a, b) => {
      const timeA = Utilities.toTimeOnlySmart(a[2]);
      const timeB = Utilities.toTimeOnlySmart(b[2]);
      return timeA - timeB;
    });
  }

  static generateUUID() {
    const chars = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.split('');
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === 'x') {
        chars[i] = Math.floor(Math.random() * 16).toString(16);
      } else if (chars[i] === 'y') {
        chars[i] = (8 + Math.floor(Math.random() * 4)).toString(16);
      }
    }
    return chars.join('');
  }

  static tryParseJSON(json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }
}