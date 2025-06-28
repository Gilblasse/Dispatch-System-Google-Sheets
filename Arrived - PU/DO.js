
/*                 =================================
                      STAMP TIME FOR P/U_D/O COLUMN
                   =================================
*/

function arrivedPuDo(){  // RANGE NEEDS TO BE 100
  var ss = SpreadsheetApp.openById("1oc_ac8XTmjcoUjy0l_vj6m5j4YYVFuRykybSHToDAME").getSheetByName("DISPATCH");
  var activeCell = ss.getRange("A1:AC100");
  var values = activeCell.getValues();
  var todaysTime = Utilities.formatDate(new Date(), 'EST', "HH:mm:ss");
  var todaysDate = Utilities.formatDate(new Date(), 'EST', "MM-dd-yyyy");
  
  
  for(var r=1; r<=98; r++){                                                                          // RANGE TO 98
    var row = r + 1;
//       Logger.log(values[r][16]);     // Start at [1][16] which is row 2 col 17 for status
      var col26 = activeCell.getCell(row, 26);
      var col27 = activeCell.getCell(row, 27);
      var puTime = activeCell.getCell(row, 12);
      var doTime = activeCell.getCell(row, 15);
    
    if(values[r][16] == "PICK UP LOCATION"){
      puTime.copyTo(col26,SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
      col26.setNumberFormat("h:mm AM/PM");
      
    }
    
    if(values[r][16] == "DROP OFF LOCATION"){
      
//      Logger.log(values[r][16]);
      doTime.copyTo(col27,SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
      col27.setNumberFormat("h:mm AM/PM");
    } 
  }
  
};



/*                 =================================
                           ERASE TIMESTAMP
                   =================================
*/

function earseTime(e){
 var ss = SpreadsheetApp.openById("1oc_ac8XTmjcoUjy0l_vj6m5j4YYVFuRykybSHToDAME").getSheetByName("DISPATCH"); 
 var range = e.range;
// var rangeCol = range.getActiveCell();
  
  if(range.getColumn() == 21){
    range.offset(0, 6).clearContent();
    range.offset(0, 5).clearContent();
  }
}


/*                 =================================
                      SHOW AND HIDE P/U_D/O EDIT
                   =================================
*/

function showCol(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dispatch = ss.getSheetByName("DISPATCH");
  var col_28 = dispatch.getRange(1, 1, 1, 28);
  
    dispatch.showColumns(26);   // Z-AA, 2 columns 
    dispatch.showColumns(27);
  
}

function hideCol(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dispatch = ss.getSheetByName("DISPATCH");
  var col_28 = dispatch.getRange(1, 1, 1, 28);

    dispatch.hideColumns(26);   // Z-AA, 2 columns 
    dispatch.hideColumns(27);
}


function toggleCol(){
  var currentCount = PropertiesService.getScriptProperties().getProperty('toggleCount');
  var count = Number(currentCount) + 1;
  
  var toggleValue = PropertiesService.getScriptProperties().getProperty('hidden');
  
  PropertiesService.getScriptProperties().setProperty('toggleCount',count);
  
  if(toggleValue=='false'){
    Logger.log("Show");
    showCol();
    PropertiesService.getScriptProperties().setProperty('hidden', 'true');
  }else{
    Logger.log("Hide");
    hideCol();
    PropertiesService.getScriptProperties().setProperty('hidden', 'false');
  }
  
}