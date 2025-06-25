function addressValidation(){                //              UPDATE ACTIVE CELL.GET ROW TO 101
  var tabLists = "lists";
  var tabValidation = "DISPATCH";
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabValidation);
  var datass = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabLists);
  
  var activeCell = ss.getActiveCell();
  
  if(activeCell.getColumn() == 4 && activeCell.getRow() > 1 && activeCell.getRow() < 101){ 
    Logger.log(activeCell.getValue());
    Logger.log(activeCell.offset(0, 6).getValue());
    
    activeCell.offset(0, 6).clearContent().clearDataValidations();
    activeCell.offset(0, 9).clearContent().clearDataValidations();
    
    // this Grabs all the values in Data Lists
    var makes = datass.getRange(1, 1, 1, datass.getLastColumn()).getValues();
    
    // this Finds the match of Active cell in dispatch that matches Data Lists and provides the column number 
    var makeIndex = makes[0].indexOf(activeCell.getValue()) + 1;
    
//    Logger.log(makeIndex);
    
    if(makeIndex != 0){// if column number is more the 0 columns it will create a validation
//      Logger.log(makeIndex + ' passed if !=0');
    
        var validationRange = datass.getRange(2, makeIndex, datass.getLastRow());
        var validationRule = SpreadsheetApp.newDataValidation().requireValueInRange(validationRange).build();
      
        activeCell.offset(0, 14).clearContent();
      
        activeCell.offset(0, 6).setDataValidation(validationRule);
        activeCell.offset(0, 9).setDataValidation(validationRule);             
     }     
  }
  
}




function rowAddressValidation(){
  var currentValue = PropertiesService.getScriptProperties().getProperty('addressValdCount');
  var count = Number(currentValue) + 1;
  
  var tabLists = "lists";
  var tabValidation = "DISPATCH";
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabValidation);
  var datass = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabLists);
  var range = ss.getRange("A2:Y100");
  var rules = range.getDataValidations();
  
  PropertiesService.getScriptProperties().setProperty('addressValdCount', count);
//Logger.log(range.getValues().length);
  for(var i=1; i<=range.getValues().length; i++){
    
      
    
      var rowCell = range.getCell(i, 4);
    
      // this Grabs all the values in Data Lists
      var makes = datass.getRange(1, 1, 1, datass.getLastColumn()).getValues();
      
      // this Finds the match of Active cell in dispatch that matches Data Lists and provides the column number 
      var makeIndex = makes[0].indexOf(rowCell.getValue()) + 1;
    
      if(makeIndex != 0){// if column number is more the 0 columns it will create a validation //      Logger.log(makeIndex + ' passed if !=0');
         var validationRange = datass.getRange(2, makeIndex, datass.getLastRow());
         var validationRule = SpreadsheetApp.newDataValidation().requireValueInRange(validationRange).build();
         
         rowCell.offset(0, 6).setDataValidation(validationRule);
         rowCell.offset(0, 9).setDataValidation(validationRule);             
     }
  }
}



















function toggleProtection(sheet, range, callback) {
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  const matched = protections.find(p => p.getRange().getA1Notation() === range.getA1Notation());

  let settings = null;

  if (matched) {
    settings = {
      editors: matched.getEditors(),
      domainEditors: matched.canDomainEdit()
    };
    matched.remove();
  }

  // Run the core action (e.g., sort)
  if (typeof callback === 'function') {
    callback();
  }

  // Reapply protection as RANGE-level protection
  const newProt = range.protect();
  newProt.setDescription("Auto-reprotected after protected action");

  if (settings) {
    if (settings.editors && settings.editors.length > 0) {
      newProt.addEditors(settings.editors);
    }
    if (settings.domainEditors) {
      newProt.setDomainEdit(true);
    }
  }
}







function sortDispatchTabA_Z() {
  const ss = SpreadsheetApp.openById("1oc_ac8XTmjcoUjy0l_vj6m5j4YYVFuRykybSHToDAME");
  const sheet = ss.getSheetByName("DISPATCH");
  const range = sheet.getRange("A2:AA100");

    range.sort([
      { column: 1, ascending: true },
      { column: 3, ascending: true }
    ]);
  // toggleProtection(sheet, range, () => {
  // });
}



function sortDispatchTabDriver() {
  
  var ss = SpreadsheetApp.openById("1oc_ac8XTmjcoUjy0l_vj6m5j4YYVFuRykybSHToDAME");
  var sheet= ss.getSheetByName("DISPATCH");
  var range = sheet.getRange("A2:AA");  // COULD UPDATE TO AA100
  
 range.sort([{column: 1, ascending: true}, {column: 21, ascending: true}]);
}



// ======================================       EXTRA DATA VALIDATION CODE        ========================================================

//function depDrop_(range, sourceRange){
//var rule = SpreadsheetApp.newDataValidation().requireValueInRange(sourceRange, true).build();
//range.setDataValidation(rule);
//}
//function onEdit (){
//var aCell = SpreadsheetApp.getActiveSheet().getActiveCell();
//var aColumn = aCell.getColumn();
//if (aColumn == 1 && SpreadsheetApp.getActiveSheet()){
//var range = SpreadsheetApp.getActiveSheet().getRange(aCell.getRow(), aColumn + 1);
//var sourceRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName(aCell.getValue());
//depDrop_(range, sourceRange);
//}
//else if (aColumn == 2 && SpreadsheetApp.getActiveSheet()){
//var range = SpreadsheetApp.getActiveSheet().getRange(aCell.getRow(), aColumn + 1);
//var sourceRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName(aCell.getValue());
//depDrop_(range, sourceRange);
//}
