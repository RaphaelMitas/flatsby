import type { Messages } from "../../messages";

export const auth = {
  login: {
    tagline: "Organisiere deinen WG-Alltag gemeinsam mit deinen Mitbewohnern.",
    signInWithGoogle: "Mit Google anmelden",
    signingInWithGoogle: "Anmeldung mit Google",
    signInWithApple: "Mit Apple anmelden",
    signingInWithApple: "Anmeldung mit Apple",
    google: "Google",
    apple: "Apple",
    email: "E-Mail-Adresse",
    emailPlaceholder: "name@beispiel.de",
    continueWithEmail: "Weiter mit E-Mail",
    sendingCode: "Code wird gesendet",
    or: "oder",
    agreement:
      "Mit der Anmeldung stimmst du unseren <terms>Nutzungsbedingungen</terms> zu. Wie wir deine Daten verarbeiten, erklärt die <privacy>Datenschutzerklärung</privacy>.",
  },
  code: {
    title: "Code eingeben",
    sentTo:
      "Wir haben einen 6-stelligen Code an <b>{email}</b> geschickt. Er gilt 5 Minuten.",
    changeEmail: "Andere E-Mail-Adresse",
    notArrived: "Nichts angekommen? Schau im Spam-Ordner nach.",
    resendIn: "Neuen Code senden in {seconds} s",
    resend: "Neuen Code senden",
    resent: "Neuer Code unterwegs. Der vorherige gilt nicht mehr.",
    invalid: "Der Code stimmt nicht. Prüf ihn und versuch es noch einmal.",
    expired: "Der Code ist abgelaufen. Codes gelten 5 Minuten.",
    tooManyAttempts: "Zu viele falsche Versuche. Fordere einen neuen Code an.",
    tooManyRequests:
      "Zu viele Codes angefordert. Versuch es später noch einmal.",
    failed: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  },
  name: {
    title: "Wie sollen dich deine Mitbewohner nennen?",
    placeholder: "Dein Name",
    hint: "Du kannst ihn später in den Einstellungen ändern.",
    continue: "Weiter",
  },
  signInCodeEmail: {
    subject: "{code} ist dein Flatsby-Code",
    heading: "Dein Anmeldecode",
    intro: "Gib diesen Code in Flatsby ein, um dich anzumelden:",
    expiry: "Der Code gilt 5 Minuten.",
    ignore:
      "Wenn du dich nicht anmelden wolltest, kannst du diese E-Mail ignorieren.",
  },
  consent: {
    title: "Willkommen bei Flatsby",
    description:
      "Bitte lies und akzeptiere unsere Bedingungen, um fortzufahren",
    agreeTerms: "Ich stimme den <link>Nutzungsbedingungen</link> zu",
    termsHint:
      "Mit diesem Häkchen erklärst du dich an unsere Bedingungen gebunden.",
    agreePrivacy: "Ich habe die <link>Datenschutzerklärung</link> gelesen",
    privacyHint: "Sie erklärt, wie wir deine Daten verarbeiten.",
    continue: "Weiter",
    error: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  },
} satisfies Messages["auth"];
