const driversSheetID = '13rpPjV3KOxfQw9W6ARA-KWSkxNI7qy6oqp4fwvlchlA'
const dispatchSheetID = '1oc_ac8XTmjcoUjy0l_vj6m5j4YYVFuRykybSHToDAME'
const prodUrl = "https://us-central1-agmtlambdaapi.cloudfunctions.net/trips"
const devUrl = "http://localhost:5001/agmtlambdaapi/us-central1/trips"


const dispatchSheetFormulas = {
  "L2:L100": `=IFERROR(INDEX('drivers data linked'!$A$2:$O$${driversDataLinkedRangeHeight},MATCH(X2,'drivers data linked'!$O$2:$O$${driversDataLinkedRangeHeight},0),MATCH($L$1,'drivers data linked'!$A$1:$O$1,0)),"")`,

  "O2:O100": `=IFERROR(INDEX('drivers data linked'!$A$2:$O$${driversDataLinkedRangeHeight},MATCH(X2,'drivers data linked'!$O$2:$O$${driversDataLinkedRangeHeight},0),MATCH($O$1,'drivers data linked'!$A$1:$O$1,0)),"")`,

  "F2:F100":`=IFERROR(VLOOKUP(D2,'ADD PASSENGERS'!$A$2:$E,3,false),"")`,
  "G2:G100": `=IFERROR(VLOOKUP(D2,'ADD PASSENGERS'!$A$2:$E,4,false),"")`,
   "H2:H100": `=IFERROR(VLOOKUP(D2,'ADD PASSENGERS'!$A$2:$E,2,false),"")`,

  "Q2:Q100": `=IFERROR( IF( OR(E2 = "REASSIGN", E2 = "COMPLETE", E2 = "CANCEL"), E2, INDEX('drivers data linked'!$A$2:$O$${driversDataLinkedRangeHeight}, MATCH(X2, 'drivers data linked'!$O$2:$O$${driversDataLinkedRangeHeight}, 0), MATCH($Q$1, 'drivers data linked'!$A$1:$O$1, 0) ) ), "" )`,

  "S2:S100": `=IFERROR(VLOOKUP(R2,vehicles!$C$2:$E$50,3,0),"")`,
  "T2:T100": `=IFERROR(VLOOKUP(R2,vehicles!$C$2:$F$50,4,0),"")`,
  "V2:V100": `=IFERROR(VLOOKUP(U2,drivers!$A$2:$C$14,2,0),"")`,
    "W2:W100": `=IFERROR(VLOOKUP(U2,drivers!$A$2:$C$14,3,false),"")`,
    "X2:X100": `=IF(D2="","", U2&"|"&A2&"|"&C2&"|"&D2&"|"&J2)`,   
}

const dispatchSheetFormulasB = {
  "L2:L100": `=IFERROR(INDEX('drivers data linked'!$A$2:$O$${driversDataLinkedRangeHeight},MATCH(X2,'drivers data linked'!$O$2:$O$${driversDataLinkedRangeHeight},0),MATCH($L$1,'drivers data linked'!$A$1:$O$1,0)),"")`,

  "O2:O100": `=IFERROR(INDEX('drivers data linked'!$A$2:$O$${driversDataLinkedRangeHeight},MATCH(X2,'drivers data linked'!$O$2:$O$${driversDataLinkedRangeHeight},0),MATCH($O$1,'drivers data linked'!$A$1:$O$1,0)),"")`,


  "F2:F100":`=IFERROR(VLOOKUP(D2,'ADD PASSENGERS'!$A$2:$E,3,false),"")`,
      "G2:G100": `=IFERROR(VLOOKUP(D2,'ADD PASSENGERS'!$A$2:$E,4,false),"")`,
      "H2:H100": `=IFERROR(VLOOKUP(D2,'ADD PASSENGERS'!$A$2:$E,2,false),"")`,

      "S2:S100": `=IFERROR(VLOOKUP(R2,vehicles!$C$2:$E$50,3,0),"")`,
      "T2:T100": `=IFERROR(VLOOKUP(R2,vehicles!$C$2:$F$50,4,0),"")`,
      "V2:V100": `=IFERROR(VLOOKUP(U2,drivers!$A$2:$C$14,2,0),"")`,
       "W2:W100": `=IFERROR(VLOOKUP(U2,drivers!$A$2:$C$14,3,false),"")`,
       "X2:X100": `=IF(D2="","", U2&"|"&A2&"|"&C2&"|"&D2&"|"&J2)`,
}



const ssIds = {
  Dispatcher: dispatchSheetID,
  Driver: driversSheetID
}

const dataSheetDefault = {
  cellRange:'A1:Y100',
  ssName:null,
  sheetName:null,
  limit:1, 
  list:[],
  isKeep: false,
  headerRange: null
}

const fullPgProps={
  dispatch: {
    cellRange:'A1:Y100', 
    sheetName: "DISPATCH", 
  },
}