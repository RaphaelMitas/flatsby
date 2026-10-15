export const splitwiseImport = {
  amount: "Amount",
  changeCsvFile: "Change CSV File",
  csvFile: "CSV File",
  currencyToImport: "Currency to import",
  deleteAll: "Delete all",
  deleteAllDescription:
    "This will permanently delete all expenses and settlements in <group>{groupName}</group>. This action cannot be undone.",
  deleteAllTitle: "Delete all expenses?",
  description: "Description",
  dialogDescription:
    "Upload a Splitwise CSV export to import expenses into this group.",
  done: "Done",
  dropOrBrowse: "Drag & drop your CSV file here, or click to browse",
  expense: "Expense",
  fileLoaded: "File loaded. Click or drop to replace.",
  foundRowsAndPeople:
    "Found {rows, plural, one {# row} other {# rows}} and {people, plural, one {# person} other {# people}}: {names}",
  importComplete: "Import complete",
  importCompleteTitle: "Import Complete",
  importCount:
    "{count, plural, one {Import # expense} other {Import # expenses}}",
  importCountShort: "Import {count}",
  importedCount:
    "{count, plural, one {Successfully imported # expense.} other {Successfully imported # expenses.}}",
  importExpenses: "Import Expenses",
  importExpensesDescription: "Import expense history from other apps.",
  importFailed: "Import failed",
  importFromSplitwise: "Import from Splitwise",
  importing: "Importing...",
  mapPeople: "Map each Splitwise person to a group member.",
  moreExpenses: "...and {count} more",
  parseErrorTitle: "Parse Error",
  previewSummary:
    "{expenses, plural, one {# expense} other {# expenses}} to import{skipped, plural, =0 {} one {, # row skipped} other {, # rows skipped}}",
  readyToImport: "Ready to import",
  resetExpenses: "Reset Expenses",
  selectCsvFile: "Select CSV File",
  selectMember: "Select member",
  settlement: "Settlement",
  skippedRow: "Row {row}: {reason}",
  skippedRows: "{count, plural, one {# skipped row} other {# skipped rows}}",
  type: "Type",
  typeToConfirm: "Type <group>{groupName}</group> to confirm",
  willBeCreated:
    "{count, plural, one {# expense will be created in this group.} other {# expenses will be created in this group.}} This action cannot be easily undone.",
  parseError: {
    invalidQuotes: "Row {row}: Trailing quote on quoted field is malformed",
    missingCurrencyColumn: "Missing 'Currency' column",
    missingQuotes: "Row {row}: Quoted field unterminated",
    noPersonColumns: "No person columns found after 'Currency'",
    tooFewFields: "Row {row}: Too few fields",
    tooManyFields: "Row {row}: Too many fields",
    undetectableDelimiter:
      "Unable to auto-detect delimiting character; defaulted to ','",
  },
  skipReason: {
    currencyMismatch: "Currency mismatch: {actual} (expected {expected})",
    invalidCost: "Invalid cost: {cost}",
    multiplePayers: "Multiple payers not supported",
    noPayer: "No payer found",
    splitMismatch: "Split amounts don't match total (off by {diff} cents)",
  },
  tooLargeTitle: "Too large to import",
  tooLarge:
    "This export is too large to import in one go. Split the CSV into smaller files, keeping the header row in each, and import them one after another.",
};
