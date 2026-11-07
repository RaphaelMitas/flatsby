import type { Messages } from "../../messages";

export const billing = {
  title: "Abrechnung",
  free: "Kostenlos",
  freePlan: "Kostenloser Tarif",
  manageSubscription: "Abo verwalten",
  creditsRemaining: "Verbleibende Credits",
  usedThisPeriod: "{used} von {total} in diesem Zeitraum verbraucht",
  outOfCredits:
    "Deine Credits sind aufgebraucht. Mach ein Upgrade, um weiterzumachen.",
  sidebar: {
    remaining:
      "{count, plural, one {{credits} Credit übrig} other {{credits} Credits übrig}}",
    tooltip:
      "Abrechnung - {count, plural, one {{credits} Credit übrig} other {{credits} Credits übrig}}",
  },
  pricing: {
    upgrade: "Upgraden",
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
