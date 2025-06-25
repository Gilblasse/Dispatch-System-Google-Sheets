class TripFormatter {
  static tripObjectToRowArray(trip) {
    return [
      trip.date || "",
      trip.time || "",
      trip.passenger || "",
      trip.phone || "",
      trip.transport || "",
      trip.medicaid || "",
      trip.invoice || "",
      "", "", // G-H (unused)
      trip.pickup || "",
      "", // K (unused)
      trip.dropoff || "",
      trip.vehicle || "",
      "", // N (unused)
      trip.driver || "",
      "", "", "", "", "", "", // O-T (unused)
      trip.notes || "",        // U (Column 21)
      "", "", "", "", "", "",  // V-AA (unused)
      trip.status || "",       // AB
      trip.id || "",           // AC (Column 24)
      "", "", "", "",          // AD-AH (unused)
      trip.returnOf || ""      // AI (Column 30)
    ];
  }

  static convertRawData(jsonStr) {
    try {
      const rows = JSON.parse(jsonStr || "[]");
      return rows.map(TripFormatter.convertRowToTrip);
    } catch (e) {
      Logger.log("⚠️ Error parsing trip JSON: " + e.message);
      return [];
    }
  }

  static convertRowToTrip(row) {
    return {
      date: row[0],
      time: row[1],
      passenger: row[2],
      phone: row[3],
      transport: row[4],
      medicaid: row[5],
      invoice: row[6],
      pickup: row[9],
      dropoff: row[11],
      vehicle: row[12],
      driver: row[14],
      notes: row[21],
      status: row[27],
      id: row[28],
      returnOf: row[30]
    };
  }

  static formatDateString(date) {
    if (!date) return "";
    const d = new Date(date);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  static toTimeOnlySmart(val) {
    if (!val || isNaN(new Date(val))) return "";
    const d = new Date(val);
    return new Date(1899, 11, 30, d.getHours(), d.getMinutes());
  }

  static sortTripsByTime(trips) {
    return (trips || []).sort((a, b) => {
      const timeA = new Date(Array.isArray(a) ? a[2] : a.time);
      const timeB = new Date(Array.isArray(b) ? b[2] : b.time);
      return timeA - timeB;
    });
  }
}
