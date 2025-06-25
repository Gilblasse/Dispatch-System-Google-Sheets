function passengerReady(){                    // UPDATE RANGE TO 101
  var timeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dispatch');
  var activeCell = timeSheet.getActiveCell();
  var readyCol = activeCell.offset(0, -1);
  var todaysTime = Utilities.formatDate(new Date(), 'America/New_York', "HH:mm:ss");
 
  if(activeCell.getValue()=='READY'){
    if((activeCell.getColumn() == 5) && (activeCell.getRow() > 1) && (activeCell.getRow() < 101)){
      
      readyCol.offset(0, -1).setValue(todaysTime);
     }
    
  }
  
}