/**
 * Backfill LOG sheet entries from legacy array format to object format.
 *
 * The LOG sheet stores JSON created by `serializeTripMap`. Older data may
 * contain arrays of row values rather than trip objects. This utility scans
 * each row, converts any array entries with {@link convertRowToTrip}, and
 * rewrites the JSON using {@link serializeTripMap}.
 *
 * Run manually if historical LOG data needs normalization.
 */
function backSyncLogObjects() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('LOG');
  if (!sheet) {
    Logger.log('LOG sheet not found.');
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, 2, lastRow - 1, 1);
  const values = range.getValues();

  values.forEach((row, i) => {
    const json = row[0];
    if (!json) return;
    let map;
    try {
      map = deserializeTripMap(json);
    } catch (e) {
      Logger.log('⚠️ Parse error on row ' + (i + 2) + ': ' + e.message);
      return;
    }

    let changed = false;
    map.forEach((val, key) => {
      if (Array.isArray(val)) {
        map.set(key, convertRowToTrip(val));
        changed = true;
      }
    });

    if (changed) {
      const serialized = serializeTripMap(map);
      sheet.getRange(i + 2, 2).setValue(serialized);
    }
  });
}
