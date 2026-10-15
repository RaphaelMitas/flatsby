import type { Messages } from "../../messages";

export const billing = {
  title: "Abrechnung",
  free: "Kostenlos",
  freePlan: "Kostenloser Tarif",
  activeUntil: "Aktiv bis {date}",
  subscribedViaAppStore: "Abonniert über den App Store",
  upgradeHint: "Upgrade für mehr Credits und Funktionen",
  manageInAppStore: "Im App Store verwalten",
  manageSubscription: "Abo verwalten",
  creditsRemaining: "Verbleibende Credits",
  usedThisPeriod: "{used} von {total} in diesem Zeitraum verbraucht",
  outOfCredits:
    "Deine Credits sind aufgebraucht. Mach ein Upgrade, um weiterzumachen.",
  plans: "Tarife",
  plansDescription: "Wähle den Tarif, der am besten zu dir passt",
  sidebar: {
    remaining:
      "{count, plural, one {{credits} Credit übrig} other {{credits} Credits übrig}}",
    tooltip:
      "Abrechnung - {count, plural, one {{credits} Credit übrig} other {{credits} Credits übrig}}",
  },
  pricing: {
    error: "Etwas ist schiefgelaufen...",
    appleCancelHint: "Zum Kündigen öffne deine Abos im App Store",
    updateFailed:
      "Tarif konnte nicht geändert werden. Bitte versuche es erneut.",
    recommended: "Empfohlen",
    monthly: "Monatlich",
    annual: "Jährlich",
    startFreeTrial: "Kostenlos testen",
    planScheduled: "Tarif geplant",
    currentPlan: "Aktueller Tarif",
    purchase: "Kaufen",
    getStartedLower: "Loslegen",
    upgrade: "Upgraden",
    downgrade: "Downgraden",
    getStarted: "Loslegen",
  },
  usage: {
    credits: "Credits",
    remaining: "{credits} übrig",
    outOfCredits: "Keine Credits mehr. Tippe für ein Upgrade.",
  },
  mobile: {
    notAvailable: "Nicht verfügbar",
    iosOnly:
      "In-App-Käufe gibt es nur unter iOS. Verwalte dein Abo auf unserer Website.",
    openWebsite: "Website öffnen",
    planActive: "{plan} aktiv",
    creditsRemaining:
      "{count, plural, one {Du hast noch {credits} Credit.} other {Du hast noch {credits} Credits.}}",
    manageOnWebHint: "Verwalte dein Abo im Web.",
    manageOnWeb: "Im Web verwalten",
    manageOnDeviceHint: "Verwalte dein Abo in den Einstellungen deines Geräts.",
    creditsAvailable: "Credits verfügbar",
    creditsAvailableDescription:
      "{count, plural, one {Du hast {credits} Credit. Verwalte dein Abo im Web.} other {Du hast {credits} Credits. Verwalte dein Abo im Web.}}",
    goBack: "Zurück",
  },
} satisfies Messages["billing"];
