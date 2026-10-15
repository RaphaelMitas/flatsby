import type { Messages } from "../../messages";

export const splitwiseImport = {
  amount: "Betrag",
  changeCsvFile: "Andere CSV-Datei wählen",
  csvFile: "CSV-Datei",
  currencyToImport: "Zu importierende Währung",
  deleteAll: "Alle löschen",
  deleteAllDescription:
    "Damit werden alle Ausgaben und Ausgleiche in <group>{groupName}</group> endgültig gelöscht. Das kann nicht rückgängig gemacht werden.",
  deleteAllTitle: "Alle Ausgaben löschen?",
  description: "Beschreibung",
  dialogDescription:
    "Lade einen CSV-Export aus Splitwise hoch, um die Ausgaben in diese Gruppe zu importieren.",
  done: "Fertig",
  dropOrBrowse: "Zieh deine CSV-Datei hierher oder klicke, um sie auszuwählen",
  expense: "Ausgabe",
  fileLoaded:
    "Datei geladen. Klicke oder zieh eine andere Datei hierher, um sie zu ersetzen.",
  foundRowsAndPeople:
    "{rows, plural, one {# Zeile} other {# Zeilen}} und {people, plural, one {# Person} other {# Personen}} gefunden: {names}",
  importComplete: "Import abgeschlossen",
  importCompleteTitle: "Import abgeschlossen",
  importCount:
    "{count, plural, one {# Ausgabe importieren} other {# Ausgaben importieren}}",
  importCountShort: "{count} importieren",
  importedCount:
    "{count, plural, one {# Ausgabe erfolgreich importiert.} other {# Ausgaben erfolgreich importiert.}}",
  importExpenses: "Ausgaben importieren",
  importExpensesDescription:
    "Importiere deine bisherigen Ausgaben aus anderen Apps.",
  importFailed: "Import fehlgeschlagen",
  importFromSplitwise: "Aus Splitwise importieren",
  importing: "Wird importiert...",
  mapPeople: "Ordne jede Person aus Splitwise einem Gruppenmitglied zu.",
  moreExpenses: "...und {count} weitere",
  parseErrorTitle: "Datei konnte nicht gelesen werden",
  previewSummary:
    "{expenses, plural, one {# Ausgabe} other {# Ausgaben}} zum Importieren{skipped, plural, =0 {} one {, # Zeile übersprungen} other {, # Zeilen übersprungen}}",
  readyToImport: "Bereit zum Importieren",
  resetExpenses: "Ausgaben zurücksetzen",
  selectCsvFile: "CSV-Datei auswählen",
  selectMember: "Mitglied auswählen",
  settlement: "Ausgleich",
  skippedRow: "Zeile {row}: {reason}",
  skippedRows:
    "{count, plural, one {# übersprungene Zeile} other {# übersprungene Zeilen}}",
  type: "Typ",
  typeToConfirm: "Gib <group>{groupName}</group> ein, um zu bestätigen",
  willBeCreated:
    "{count, plural, one {# Ausgabe wird in dieser Gruppe erstellt.} other {# Ausgaben werden in dieser Gruppe erstellt.}} Das lässt sich nicht ohne Weiteres rückgängig machen.",
  parseError: {
    invalidQuotes:
      "Zeile {row}: Das schließende Anführungszeichen eines Felds ist ungültig",
    missingCurrencyColumn: "Die Spalte 'Currency' fehlt",
    missingQuotes:
      "Zeile {row}: Ein Feld in Anführungszeichen wird nicht geschlossen",
    noPersonColumns: "Nach 'Currency' wurden keine Personenspalten gefunden",
    tooFewFields: "Zeile {row}: Zu wenige Felder",
    tooManyFields: "Zeile {row}: Zu viele Felder",
    undetectableDelimiter:
      "Das Trennzeichen konnte nicht erkannt werden, es wird ',' verwendet",
  },
  skipReason: {
    currencyMismatch: "Andere Währung: {actual} (erwartet: {expected})",
    invalidCost: "Ungültiger Betrag: {cost}",
    multiplePayers: "Mehrere zahlende Personen werden nicht unterstützt",
    noPayer: "Keine zahlende Person gefunden",
    splitMismatch:
      "Die Anteile ergeben nicht den Gesamtbetrag (Abweichung: {diff} Cent)",
  },
  tooLargeTitle: "Zu groß für den Import",
  tooLarge:
    "Dieser Export ist zu groß, um ihn auf einmal zu importieren. Teile die CSV in kleinere Dateien auf, behalte in jeder die Kopfzeile und importiere sie nacheinander.",
} satisfies Messages["splitwiseImport"];
