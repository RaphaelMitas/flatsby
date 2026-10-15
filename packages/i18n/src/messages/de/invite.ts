import type { Messages } from "../../messages";

export const invite = {
  open: "Leute einladen",
  title: "Zu {group} einladen",
  anyoneCanJoin: "Jeder mit diesem Link oder Code kann beitreten.",
  scanWithCamera: "Mit der Handykamera scannen",
  orEnterCode: "oder diesen Code in Flatsby eingeben",
  shareLink: "Link teilen",
  shareMessage: "Tritt {group} auf Flatsby bei: {link}",
  resetLink: "Link zurücksetzen",
  resetFailed:
    "Der Link konnte nicht zurückgesetzt werden. Versuch es noch einmal.",
  loadFailed:
    "Die Einladung konnte nicht geladen werden. Versuch es noch einmal.",
  expiresIn:
    "{days, plural, =1 {Läuft innerhalb eines Tages ab} other {Läuft in # Tagen ab}}",
  join: {
    screenTitle: "Gruppe beitreten",
    withCode: "Mit Code beitreten",
    title: "Gruppe beitreten",
    enterCode: "Gib den {length}-stelligen Code ein",
    lookAlikes: "O und 0 sowie I und 1 gelten als gleich",
    continue: "Weiter",
    invitedYouTo: "{name} hat dich eingeladen zu",
    consent:
      "Die Mitglieder sehen deinen Namen und dein Profilbild, und du siehst die Listen und Ausgaben der Gruppe.",
    join: "{group} beitreten",
    joinFailed: "Beitreten hat nicht geklappt. Versuch es noch einmal.",
    signInToJoin: "Zum Beitreten anmelden",
    signInToJoinGroup: "Anmelden, um {group} beizutreten",
    openGroup: "Gruppe öffnen",
    notNow: "Nicht jetzt",
    alreadyMember: "Du bist schon in {group}",
    expiredTitle: "Diese Einladung ist abgelaufen",
    expiredHint: "Bitte jemanden in der Gruppe um einen neuen Link.",
    loadFailedTitle: "Die Einladung konnte nicht geladen werden",
    tryAgain: "Erneut versuchen",
    goToFlatsby: "Zu Flatsby",
    afterInstall: "Tippe nach der Installation auf „Mit Code beitreten“",
    continueInBrowser: "Im Browser weiter",
    openInApp: "In Flatsby öffnen",
    appStore: "Laden im App Store",
    googlePlay: "Jetzt bei Google Play",
  },
} satisfies Messages["invite"];
