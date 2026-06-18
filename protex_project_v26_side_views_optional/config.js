// PROTEX Supabase Konfiguration
// Publishable Key ist bereits eingetragen.
// Wichtig: NICHT den Secret Key verwenden.

window.PROTEX_CONFIG = {
  SUPABASE_URL: "https://uzlfyoonzcdsbcxpvvwt.supabase.co",
  SUPABASE_KEY: "sb_publishable_Tf7dcoLI_eAbkVXyr1DdSw_YkJYwSTJ",
  STORAGE_BUCKET: "products",

  // Rabattcodes selbst festlegen:
  // Beispiel: PROTEX10 = 10% Rabatt
  // Code immer groß schreiben.
  DISCOUNT_CODES: {
    "PROTEX10": 10,
    "VEREIN20": 20,
    "VIP30": 30,
    "SPONSOR40": 40
  },

  // Druckkosten pro Stück:
  // 1 Druckelement = +5 € pro Stück.
  PRINT_PRICE_PER_ELEMENT: 5.00
};
