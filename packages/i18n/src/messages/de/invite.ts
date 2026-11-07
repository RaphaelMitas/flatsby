import type { Messages } from "../../messages";

export const invite = {
  open: "Leute einladen",
  title: "Zu {group} einladen",
  anyoneCanJoin: "Jeder mit diesem Link oder Code kann beitreten.",
  scanWithCamera: "Mit der Handykamera scannen",
  orEnterCode: "oder diesen Code in Flatsby eingeben",
  shareLink: "Link teilen",
  shareGroup:
    "Kannst du kurz unserer WG auf Flatsby beitreten? Dann geht die Einkaufsliste nicht mehr im Chat unter: {link}",
  sharePersonal:
    "{name}, ich hab dich schon in unserer WG auf Flatsby eingetragen. Kannst du kurz beitreten? Dann geht die Einkaufsliste nicht mehr im Chat unter: {link}",
  resetLink: "Link zurücksetzen",
  resetFailed:
    "Der Link konnte nicht zurückgesetzt werden. Bitte versuch es noch einmal.",
  loadFailed:
    "Die Einladung konnte nicht geladen werden. Bitte versuch es noch einmal.",
  done: "Fertig",
  card: {
    title: "{group} steht. Jetzt fehlen deine Mitbewohner.",
    body: "Schick ihnen den Link. Wer beitritt, taucht hier auf.",
    namedBody:
      "Schick jedem seinen Link. Nach der Anmeldung ist sein Platz schon ausgewählt.",
    preview: "Das schickst du:",
    send: "Schicken",
    sendTo: "Link an {name} schicken",
    groupChat: "Link für den WG-Chat",
    code: "Code zum Abtippen",
    copied: "Kopiert",
    copiedFor: "Für {name} kopiert",
    copyFailed: "Kopieren hat nicht geklappt. Bitte versuch es noch einmal.",
    dismiss: "Ausblenden",
  },
  expiresIn:
    "{days, plural, =1 {Läuft innerhalb eines Tages ab} other {Läuft in # Tagen ab}}",
  join: {
    withCode: "Mit Code beitreten",
    title: "Gruppe beitreten",
    enterCode: "Gib den {length}-stelligen Code ein",
    lookAlikes: "O und 0 sowie I und 1 gelten als gleich",
    continue: "Weiter",
    invitedYouTo: "Einladung von {name}",
    cardTitle: "{name} hat dich zu {group} eingeladen",
    cardDescription:
      "{members} · Einkaufslisten, Ausgaben und Putzplan zusammen.",
    consent:
      "Die Mitglieder sehen deinen Namen und dein Profilbild, und du siehst die Listen und Ausgaben der Gruppe.",
    join: "{group} beitreten",
    joinFailed: "Beitreten hat nicht geklappt. Bitte versuch es noch einmal.",
    signInToJoinGroup: "Anmelden, um {group} beizutreten",
    openGroup: "Gruppe öffnen",
    alreadyListed: "Bist du schon eingetragen?",
    iAm: "Ich bin {name}",
    imNew: "Nein, ich bin neu hier",
    joinAs: "Als {name} beitreten",
    placeholderTaken: "{name} ist nicht mehr frei. Wähl noch einmal.",
    notNow: "Nicht jetzt",
    alreadyMember: "Du bist schon in {group}",
    expiredTitle: "Diese Einladung ist abgelaufen",
    expiredHint: "Bitte jemanden in der Gruppe um einen neuen Link.",
    loadFailedTitle: "Die Einladung konnte nicht geladen werden",
    goToFlatsby: "Zu Flatsby",
    afterInstall: "Tippe nach der Installation auf „Mit Code beitreten“",
    continueInBrowser: "Im Browser weiter",
    openInApp: "In Flatsby öffnen",
    appStore: "Laden im App Store",
    googlePlay: "Jetzt bei Google Play",
  },
} satisfies Messages["invite"];
