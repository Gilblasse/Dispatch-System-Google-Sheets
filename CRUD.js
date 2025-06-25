// ===============================
//  PASSENGER CRUD OPERATIONS
// ===============================


// BATCH UPDATE
function updatePassengerProfile(key, profile) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("PASSENGER_CACHE");
  const range = sheet.getRange("A2:E2");
  const [namesRaw, phonesRaw, addressesRaw, medicaidsRaw, typesRaw] = range.getValues()[0];

  const names = JSON.parse(namesRaw || "{}");
  const phones = JSON.parse(phonesRaw || "{}");
  const addresses = JSON.parse(addressesRaw || "{}");
  const medicaids = JSON.parse(medicaidsRaw || "{}");
  const types = JSON.parse(typesRaw || "{}");

  // Update names
  if (profile.firstName && profile.lastName) {
    names[key] = {
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim()
    };
  }

  // Update arrays
  if (Array.isArray(profile.phones)) {
    phones[key] = Array.from(new Set(profile.phones.map(p => String(p).trim()).filter(Boolean)));
  }
  if (Array.isArray(profile.addresses)) {
    addresses[key] = Array.from(new Set(profile.addresses.map(a => String(a).trim()).filter(Boolean)));
  }
  if (Array.isArray(profile.medicaids)) {
    medicaids[key] = Array.from(new Set(profile.medicaids.map(m => String(m).trim()).filter(Boolean)));
  }

  // Update type
  if (profile.type) {
    types[key] = String(profile.type).trim();
  }

  // Save back
  range.setValues([[
    JSON.stringify(names),
    JSON.stringify(phones),
    JSON.stringify(addresses),
    JSON.stringify(medicaids),
    JSON.stringify(types)
  ]]);
}


function getPassengerNames() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("ADD PASSENGERS");
  const data = sheet.getRange("A2:A").getValues();
  const nameSet = new Set();

  for (let i = 0; i < data.length; i++) {
    const rawName = String(data[i][0] || "").trim();

    if (
      !rawName ||
      rawName.length < 3 ||
      /^[^a-zA-Z]*$/.test(rawName) || 
      /[^a-zA-Z,\s]/.test(rawName)
    ) continue;

    nameSet.add(rawName.replace(/\s+/g, " "));
  }

  return Array.from(nameSet).sort();
}

function getPassengerProfiles() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("ADD PASSENGERS");
  const data = sheet.getRange("A2:E").getValues();
  const profiles = {};

  for (let i = 0; i < data.length; i++) {
    const [rawName, medicaid, type, phone, address] = data[i];
    const name = String(rawName || "").trim();

    // Skip junk names
    if (
      !name ||
      name.length < 3 ||
      /^[^a-zA-Z]*$/.test(name) ||
      /[^a-zA-Z,\s]/.test(name)
    ) continue;

    // Init profile
    if (!profiles[name]) {
      profiles[name] = {
        medicaid: String(medicaid || "").trim(),
        type: String(type || "").trim(),
        phones: [],
        addresses: []
      };
    }

    // Set Medicaid and Type only if not already set
    if (!profiles[name].medicaid && medicaid) {
      profiles[name].medicaid = String(medicaid).trim();
    }
    if (!profiles[name].type && type) {
      profiles[name].type = String(type).trim();
    }

    // Add phone and address (avoid duplicates)
    const phoneVal = String(phone || "").trim();
    const addressVal = String(address || "").trim();

    if (phoneVal && !profiles[name].phones.includes(phoneVal)) {
      profiles[name].phones.push(phoneVal);
    }

    if (addressVal && !profiles[name].addresses.includes(addressVal)) {
      profiles[name].addresses.push(addressVal);
    }
  }

  return profiles;
}

//  ==========  END  ============




// ===============================
//          VEHICALS
// ===============================

function getVehicleOptions() {
  const ss = SpreadsheetApp.openById("13ynJ0Q_pn-Ao4fcJTmpSswbAk8MRy-RMpCF3YnIm-Ug");
  const sheet = ss.getSheetByName("Vehicles");
  const data = sheet.getRange("B2:K").getValues(); // B → K = columns 2 → 11

  const options = [];

  for (let i = 0; i < data.length; i++) {
    const [name, nickname, make, plate, type, vin, , , , , vehicleType] = data[i];

    if (!name) continue;

    const label = nickname
      ? `${name} (${nickname})`
      : name;

    options.push({
      label: label.trim(),
      value: name.trim(),
      vehicleType: (vehicleType || "").trim(),
      meta: {
        plate: plate?.toString().trim(),
        make: make?.toString().trim(),
        type: type?.toString().trim(),
        vin: vin?.toString().trim()
      }
    });
  }

  return options;
}


//  ==========  END  ============



// ===============================
//          DRIVERS
// ===============================

function getDriverOptions() {
  const ss = SpreadsheetApp.openById("1W9gT2Tkifd9Mdh9q3ZGaR-4Q6E24S75AzGuRe10DrKE");
  const sheet = ss.getSheetByName("STAFF");
  const data = sheet.getRange("A2:AT").getValues(); // Includes Column AT

  const options = [];

  for (let i = 0; i < data.length; i++) {
    const name = String(data[i][0] || "").trim();
    if (!name) continue;

    options.push({
      label: name,
      value: name,
      license: String(data[i][1] || "").trim(),
      initials: String(data[i][2] || "").trim(),
      phone: String(data[i][3] || "").trim(),
      email: String(data[i][4] || "").trim(),
      carrier: String(data[0][45] || "").trim()  // Column AT = index 45 (0-based)
    });
  }

  return options;
}

//  ==========  END  ============




