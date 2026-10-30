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
    signInWithPasskey: "Mit Passkey anmelden",
    sendingCode: "Code wird gesendet",
    or: "oder",
    agreement:
      "Mit der Anmeldung stimmst du unseren <terms>Nutzungsbedingungen</terms> zu. Wie wir deine Daten verarbeiten, erklärt die <privacy>Datenschutzerklärung</privacy>.",
  },
  code: {
    title: "Code eingeben",
    sentTo:
      "Wir haben einen {length}-stelligen Code an <b>{email}</b> geschickt. Er gilt {minutes} Minuten.",
    changeEmail: "Andere E-Mail-Adresse",
    notArrived: "Nichts angekommen? Schau im Spam-Ordner nach.",
    resendIn: "Neuen Code senden in {seconds} s",
    resend: "Neuen Code senden",
    resent: "Code erneut gesendet. Nimm den aus der neuesten E-Mail.",
    invalid: "Der Code stimmt nicht. Prüf ihn und versuch es noch einmal.",
    expired: "Der Code ist abgelaufen. Fordere einen neuen an.",
    tooManyAttempts: "Zu viele falsche Versuche. Fordere einen neuen Code an.",
    tooManyRequests:
      "Zu viele Versuche. Warte eine Minute und versuch es noch einmal.",
    tooManyCodes:
      "Zu viele Codes für diese Adresse. Versuch es in einer Stunde noch einmal.",
    failed: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  },
  passkey: {
    title: "Nächstes Mal ohne Code?",
    bodyIos:
      "Mit einem Passkey meldest du dich per Face ID oder Touch ID an. Er liegt in deinem iCloud-Schlüsselbund und funktioniert auf all deinen Apple-Geräten.",
    bodyAndroid:
      "Mit einem Passkey meldest du dich per Fingerabdruck oder Displaysperre an. Er liegt im Google Passwortmanager und funktioniert auf all deinen Android-Geräten.",
    bodyWeb:
      "Mit einem Passkey meldest du dich per Fingerabdruck, Gesicht oder Geräte-PIN an, statt auf eine E-Mail zu warten.",
    create: "Passkey einrichten",
    later: "Jetzt nicht",
    createdTitle: "Passkey eingerichtet",
    createdBody: "Beim nächsten Mal reicht ein Blick oder ein Fingerabdruck.",
    continue: "Los geht's",
    failed: "Das hat nicht geklappt. Versuch es noch einmal.",
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
    expiry: "Der Code gilt {minutes} Minuten.",
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
