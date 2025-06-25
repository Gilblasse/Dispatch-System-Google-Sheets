// ============================
// 6. DispatchFormulas.gs
// ============================
class DispatchFormulas {
  static getDefaultFormulas() {
    return typeof dispatchSheetFormulas !== 'undefined' ? dispatchSheetFormulas : [];
  }

  static getFallbackFormulas() {
    return typeof dispatchSheetFormulasB !== 'undefined' ? dispatchSheetFormulasB : [];
  }
}