class TripsTest {
  deleteStandingOrderOnDates() {
    const ss = SpreadsheetApp.create('DeleteStandingOrderTest');
    const logSheet = ss.getSheets()[0];
    logSheet.setName('LOG');
    logSheet.getRange('A1:B1').setValues([['Date', 'Trips']]);

    const service = new SpreadsheetService({ Dispatcher: ss.getId() });
    const manager = new TripManager(service, logManager);

    const standing = {
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
      previousId: '',
      standing
    };
    const trip1 = Object.assign({ id: 't1', date: '2024-06-01' }, baseTrip);
    const trip2 = Object.assign({ id: 't2', date: '2024-06-02' }, baseTrip);

    manager.addTripToLog(trip1);
    manager.addTripToLog(trip2);

    manager.deleteStandingOrderOnDates(standing, ['2024-06-01']);

    const remaining = manager.getAllTrips().map(t => t.id);
    if (remaining.length !== 1 || remaining[0] !== 't2') {
      throw new Error('Trip was not removed from log sheet');
    } else {
      Logger.log('testDeleteStandingOrderOnDates passed');
    }

    DriveApp.getFileById(ss.getId()).setTrashed(true);
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
