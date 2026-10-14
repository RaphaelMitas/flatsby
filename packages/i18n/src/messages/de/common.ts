import type { Messages } from "../../messages";

export const common = {
  back: "Zurück",
  cancel: "Abbrechen",
  category: "Kategorie",
  close: "Schließen",
  creating: "Wird erstellt...",
  date: "Datum",
  delete: "Löschen",
  deleting: "Wird gelöscht...",
  edit: "Bearbeiten",
  error: "Fehler",
  loading: "Wird geladen...",
  next: "Weiter",
  noGroupSelected: "Keine Gruppe ausgewählt",
  noGroupSelectedHint:
    "Keine Gruppe ausgewählt. Bitte wähle zuerst eine Gruppe aus.",
  other: "Sonstiges",
  remove: "Entfernen",
  save: "Speichern",
  saving: "Wird gespeichert...",
  selectCategory: "Kategorie wählen",
  unknown: "Unbekannt",
  unknownError: "Unbekannter Fehler",
  updating: "Wird aktualisiert...",
  select: "Auswählen",
  previousSlide: "Vorherige Folie",
  nextSlide: "Nächste Folie",
  deleteConfirmation: {
    title: "Eintrag löschen",
    description:
      "Möchtest du „{name}“ wirklich löschen? Das lässt sich nicht rückgängig machen und entfernt alle zugehörigen Daten dauerhaft.",
    label: "Gib zur Bestätigung den Namen ein: {name}",
    required: "Bestätigung erforderlich",
    placeholder: "Namen eingeben",
  },
} satisfies Messages["common"];
