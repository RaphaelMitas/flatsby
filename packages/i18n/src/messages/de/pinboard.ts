export const pinboard = {
  title: "Pinnwand",
  homeHint: "Was hier alle wissen sollten",
  add: "Eintrag hinzufügen",
  newTitle: "Neuer Eintrag",
  editTitle: "Eintrag bearbeiten",
  editEntry: "{title} bearbeiten",
  empty: {
    title: "Noch nichts angepinnt",
    body: "Hier steht, wonach jeder Mitbewohner einmal fragt.",
    startWith: "Fang an mit",
  },
  starters: {
    wifi: "WLAN",
    landlord: "Vermieter",
    bins: "Müll",
    houseRules: "Hausregeln",
  },
  form: {
    title: "Titel",
    body: "Text",
    bodyPlaceholder: "Papier wird dienstags abgeholt",
    icon: "Symbol",
    create: "Anpinnen",
    note: "Notiz",
    optional: "optional",
    notePlaceholder: "Der Router steht im Flur",
    ssid: "Netzwerkname",
    ssidPlaceholder: "FRITZ!Box 7590",
    ssidHint:
      "Muss genau so heißen wie das Netzwerk, mit Groß- und Kleinschreibung und Leerzeichen. Sonst funktioniert der QR-Code nicht.",
    password: "Passwort",
    wifiHelp:
      "Beides steht auf dem Aufkleber am Router. Oder scann den QR-Code, den ein verbundenes Handy beim Teilen des WLANs zeigt.",
    takePhoto: "Code fotografieren",
    choosePicture: "Bild auswählen",
    scanFile: "WLAN-QR-Code scannen",
    noCode:
      "In dem Bild ist kein WLAN-QR-Code. Versuch es näher dran oder tipp es ein.",
    cameraDenied:
      "Erlaube den Kamerazugriff in den Einstellungen, um einen Code zu fotografieren.",
  },
  qr: {
    open: "QR-Code",
    hint: "Handykamera draufhalten, um ins WLAN zu kommen.",
  },
  icon: {
    pin: "Pin",
    wifi: "WLAN",
    "key-round": "Schlüssel",
    phone: "Telefon",
    "trash-2": "Müll",
    "scroll-text": "Regeln",
    "washing-machine": "Waschmaschine",
    zap: "Strom",
  },
  delete: {
    title: "Eintrag löschen",
    description: "„{title}“ für alle in der Gruppe löschen?",
  },
  saveFailed:
    "Der Eintrag konnte nicht gespeichert werden. Dein Text steht wieder im Formular.",
  deleteFailed:
    "Der Eintrag konnte nicht gelöscht werden. Bitte versuch es noch einmal.",
  full: "Die Pinnwand ist voll. Lösch einen Eintrag, um einen neuen anzulegen.",
  validation: {
    titleRequired: "Gib dem Eintrag einen Titel",
    titleTooLong: "Der Titel ist zu lang",
    bodyRequired: "Schreib, was angepinnt werden soll",
    bodyTooLong: "Der Text ist zu lang",
    ssidTooLong: "Ein Netzwerkname hat höchstens 32 Zeichen",
    passwordTooLong: "Ein WLAN-Passwort hat höchstens 64 Zeichen",
  },
};
