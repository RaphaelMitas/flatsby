import type { Messages } from "../../messages";

export const auth = {
  login: {
    tagline: "Organisiere deinen WG-Alltag gemeinsam mit deinen Mitbewohnern.",
    signInWithGoogle: "Mit Google anmelden",
    signingInWithGoogle: "Anmeldung mit Google",
    signInWithApple: "Mit Apple anmelden",
    signingInWithApple: "Anmeldung mit Apple",
    agreement:
      "Mit der Anmeldung stimmst du unseren <terms>Nutzungsbedingungen</terms> und der <privacy>Datenschutzerklärung</privacy> zu",
  },
  consent: {
    title: "Willkommen bei Flatsby",
    description:
      "Bitte lies und akzeptiere unsere Bedingungen, um fortzufahren",
    agreeTerms: "Ich stimme den <link>Nutzungsbedingungen</link> zu",
    termsHint:
      "Mit diesem Häkchen erklärst du dich an unsere Bedingungen gebunden.",
    agreePrivacy: "Ich stimme der <link>Datenschutzerklärung</link> zu",
    privacyHint:
      "Mit diesem Häkchen willigst du in unsere Datenverarbeitung ein.",
    continue: "Weiter",
    error: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  },
} satisfies Messages["auth"];
