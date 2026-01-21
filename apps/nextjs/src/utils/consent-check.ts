// Current version of legal documents - update when documents change
export const CURRENT_LEGAL_VERSION = "1.0";

interface UserConsentStatus {
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
}

/**
 * Check if user needs to accept current terms and privacy policy
 */
export function requiresConsent(user: UserConsentStatus): boolean {
  // User needs consent if they haven't accepted terms or privacy policy
  // or if the version they accepted is different from current
  const needsTerms =
    !user.termsAcceptedAt || user.termsVersion !== CURRENT_LEGAL_VERSION;
  const needsPrivacy =
    !user.privacyAcceptedAt || user.privacyVersion !== CURRENT_LEGAL_VERSION;

  return needsTerms || needsPrivacy;
}

/**
 * Get which consents are missing
 */
export function getMissingConsents(user: UserConsentStatus): {
  needsTerms: boolean;
  needsPrivacy: boolean;
} {
  return {
    needsTerms:
      !user.termsAcceptedAt || user.termsVersion !== CURRENT_LEGAL_VERSION,
    needsPrivacy:
      !user.privacyAcceptedAt || user.privacyVersion !== CURRENT_LEGAL_VERSION,
  };
}
