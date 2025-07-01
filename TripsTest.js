class TripsTest {
  deleteStandingOrderOnDates() {
    const ss = SpreadsheetApp.create('DeleteStandingOrderTest');
    const logSheet = ss.getSheets()[0];
    logSheet.setName('LOG');
    logSheet.getRange('A1:B1').setValues([['Date', 'Trips']]);

    const service = new SpreadsheetService({ Dispatcher: ss.getId() });
    const manager = new TripManager(service, logManager);

    const standingOrder = {
      frequency: 'DAILY',
      startDate: '2024-06-01',
      endDate: '2024-06-05',
      days: ['MO', 'TU', 'WE', 'TH', 'FR']
    };

    const baseTrip = {
      date: '2024-06-01',
      time: '09:00',
      passenger: 'Test Passenger',
      transport: 'Test Transport',
      phone: '555-0000',
      medicaid: 'MED123',
      invoice: 'test',
      pickup: 'Home',
      dropoff: 'Clinic',
      status: '',
      vehicle: '',
      driver: '',
      notes: 'This is a TEST !!!',
      returnOf: 'orig',
      recurringId: '',
      standingOrder
    };
    const trip1 = Object.assign({ id: 't1', date: '2024-06-01' }, baseTrip);
    const trip2 = Object.assign({ id: 't2', date: '2024-06-02' }, baseTrip);

    manager.addTripToLog(trip1);
    manager.addTripToLog(trip2);

    manager.deleteStandingOrderOnDates(standingOrder, ['2024-06-01']);

    const remaining = manager.getAllTrips().map(t => t.id);
    if (remaining.length !== 1 || remaining[0] !== 't2') {
      throw new Error('Trip was not removed from log sheet');
    } else {
      Logger.log('testDeleteStandingOrderOnDates passed');
    }

    DriveApp.getFileById(ss.getId()).setTrashed(true);
  }

  backSyncLogObjectsUsesTripKeyID() {
    const ss = SpreadsheetApp.create('BackSyncLogObjectsTest');
    const sheet = ss.getSheets()[0];
    sheet.setName('LOG');
    sheet.getRange('A1:B1').setValues([['Date', 'Trips']]);

    const service = new SpreadsheetService({ Dispatcher: ss.getId() });
    const manager = new TripManager(service, logManager);

    const trip = {
      id: 't1',
      tripKeyID: 'key123',
      date: '2024-07-01',
      time: '10:00',
      passenger: 'P',
      transport: 'V',
      phone: '555',
      medicaid: 'M',
      invoice: 'I',
      pickup: 'A',
      dropoff: 'B',
      status: '',
      vehicle: '',
      driver: '',
      notes: '',
      returnOf: '',
      recurringId: ''
    };

    const map = new Map([['wrong', trip]]);
    sheet.appendRow(['2024-07-01', serializeTripMap(map)]);

    backSyncLogObjects();

    const updated = deserializeTripMap(sheet.getRange(2, 2).getValue());
    const key = Array.from(updated.keys())[0];
    if (key !== 'key123') {
      throw new Error('backSyncLogObjects did not persist tripKeyID');
    } else {
      Logger.log('testBackSyncLogObjectsUsesTripKeyID passed');
    }

    DriveApp.getFileById(ss.getId()).setTrashed(true);
  }

  dispatchRowToTripObjectStatusAndNotes() {
    const row = [];
    row[10] = 'key1';       // TripIDKEY
    row[23] = 'id1';        // Unique trip ID
    row[0] = '2024-07-04';  // Date
    row[1] = '08:00';       // Time
    row[2] = 'P';           // Passenger
    row[4] = 'T';           // Transport
    row[3] = '555';         // Phone
    row[5] = 'M';           // Medicaid
    row[6] = 'I';           // Invoice
    row[9] = 'A';           // Pick Up
    row[11] = 'B';          // Drop Off
    row[12] = 'V';          // Vehicle
    row[14] = 'D';          // Driver
    row[31] = '';           // recurringId
    row[24] = 'note';       // Notes
    row[30] = '';           // returnOf
    row[16] = 'COMPLETE';   // Status column Q

    const trip = dispatchRowToTripObject(row);
    if (trip.status !== 'COMPLETE' || trip.notes !== 'note') {
      throw new Error('dispatchRowToTripObject did not map status and notes correctly');
    } else {
      Logger.log('testDispatchRowToTripObjectStatusAndNotes passed');
    }
  }

  testOnEdit() {
    tripManager.testOnEdit();
  }

  showAddTripSidebar(date) {
    tripRouter.showAddTripSidebar(date);
  }

  openEditTripSidebar(id) {
    tripRouter.openEditTripSidebar(id);
  }

  showEditTripSidebar(id, date) {
    tripRouter.showEditTripSidebar(id, date);
  }

  openPassengerTripList(date) {
    tripRouter.openPassengerTripList(date);
  }

  showRestoreDatePicker() {
    tripRouter.showRestoreDatePicker();
  }
}

const tripsTest = new TripsTest();

function TEST_deleteStandingOrderOnDates() { tripsTest.deleteStandingOrderOnDates(); }
function TEST_onEdit() { tripsTest.testOnEdit(); }
function TEST_showAddTripSidebar(date) { tripsTest.showAddTripSidebar(date); }
function TEST_openEditTripSidebar(id) { tripsTest.openEditTripSidebar(id); }
function TEST_showEditTripSidebar(id, date) { tripsTest.showEditTripSidebar(id, date); }
function TEST_openPassengerTripList(date) { tripsTest.openPassengerTripList(date); }
function TEST_showRestoreDatePicker() { tripsTest.showRestoreDatePicker(); }
function TEST_backSyncLogObjectsUsesTripKeyID() { tripsTest.backSyncLogObjectsUsesTripKeyID(); }
function TEST_dispatchRowToTripObjectStatusAndNotes() { tripsTest.dispatchRowToTripObjectStatusAndNotes(); }
