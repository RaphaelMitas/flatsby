import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";

import {
  LegalAddress,
  LegalHeading,
  LegalLink,
  LegalList,
  LegalParagraph,
  LegalSection,
  LegalSubheading,
} from "../_components/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy - Flatsby",
  description: "Privacy Policy for Flatsby",
};

const PRIVACY_VERSION = "1.0";
const LAST_UPDATED = "January 2026";

function TableOfContents() {
  const items = [
    { id: "introduction", label: "Introduction" },
    { id: "data-controller", label: "Data Controller" },
    { id: "data-collected", label: "Data We Collect" },
    { id: "legal-basis", label: "Legal Basis for Processing" },
    { id: "data-use", label: "How We Use Your Data" },
    { id: "data-sharing", label: "Data Sharing" },
    { id: "data-retention", label: "Data Retention" },
    { id: "your-rights", label: "Your Rights (GDPR)" },
    { id: "security", label: "Data Security" },
    { id: "international", label: "International Data Transfers" },
    { id: "children", label: "Children's Privacy" },
    { id: "changes", label: "Changes to This Policy" },
    { id: "contact", label: "Contact Us" },
  ];

  return (
    <nav className="bg-muted/50 mb-10 rounded-lg p-4">
      <h3 className="mb-3 text-sm font-semibold">Table of Contents</h3>
      <ol className="text-muted-foreground list-inside list-decimal space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function PrivacyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Privacy Policy</CardTitle>
        <CardDescription>
          Version {PRIVACY_VERSION} · Last updated: {LAST_UPDATED}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TableOfContents />

        <LegalSection id="introduction">
          <LegalHeading>1. Introduction</LegalHeading>
          <LegalParagraph>
            This Privacy Policy explains how Flatsby (&quot;we&quot;,
            &quot;us&quot;, &quot;our&quot;) collects, uses, and protects your
            personal data when you use our household management application. We
            are committed to protecting your privacy and complying with the
            General Data Protection Regulation (GDPR) and other applicable data
            protection laws.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="data-controller">
          <LegalHeading>2. Data Controller</LegalHeading>
          <LegalParagraph>
            The data controller responsible for your personal data is:
          </LegalParagraph>
          <LegalAddress>
            Raphael Mitas
            <br />
            Weiterstädter Str. 65
            <br />
            64291 Darmstadt, Germany
            <br />
            Email: support@flatsby.com
          </LegalAddress>
        </LegalSection>

        <LegalSection id="data-collected">
          <LegalHeading>3. Data We Collect</LegalHeading>

          <LegalSubheading>3.1 Account Information</LegalSubheading>
          <LegalParagraph>
            When you sign up via Google or Apple Sign-In, we receive:
          </LegalParagraph>
          <LegalList>
            <li>Your name</li>
            <li>Email address</li>
            <li>Profile picture (if provided)</li>
            <li>Unique identifier from the authentication provider</li>
          </LegalList>

          <LegalSubheading>3.2 User-Generated Content</LegalSubheading>
          <LegalParagraph>Data you create while using the app:</LegalParagraph>
          <LegalList>
            <li>
              Shopping lists and items (names, categories, completion status)
            </li>
            <li>
              Expenses (amounts, descriptions, dates, categories, split
              information)
            </li>
            <li>Group information (names, member relationships)</li>
            <li>Chat conversations with our AI assistant</li>
          </LegalList>

          <LegalSubheading>3.3 Technical Data</LegalSubheading>
          <LegalParagraph>Automatically collected data:</LegalParagraph>
          <LegalList>
            <li>IP address (for session management)</li>
            <li>Device type and operating system</li>
            <li>App usage patterns (features used, timestamps)</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="legal-basis">
          <LegalHeading>4. Legal Basis for Processing</LegalHeading>
          <LegalParagraph>
            We process your personal data based on:
          </LegalParagraph>
          <LegalList>
            <li>
              <strong>Contract performance (Art. 6(1)(b) GDPR):</strong> To
              provide the service you signed up for, including AI-powered
              features like automatic category detection
            </li>
            <li>
              <strong>Consent (Art. 6(1)(a) GDPR):</strong> For the AI chat
              assistant
            </li>
            <li>
              <strong>Legitimate interests (Art. 6(1)(f) GDPR):</strong> For
              service improvement and security
            </li>
            <li>
              <strong>Legal obligations (Art. 6(1)(c) GDPR):</strong> To comply
              with applicable laws
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="data-use">
          <LegalHeading>5. How We Use Your Data</LegalHeading>
          <LegalParagraph>We use your personal data to:</LegalParagraph>
          <LegalList>
            <li>Provide and maintain the Flatsby service</li>
            <li>Enable collaboration with your household members</li>
            <li>Process and display your shopping lists and expenses</li>
            <li>Provide AI-powered assistance (when enabled)</li>
            <li>Send service-related communications</li>
            <li>Improve and optimize the service</li>
            <li>Ensure security and prevent fraud</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="data-sharing">
          <LegalHeading>6. Data Sharing</LegalHeading>

          <LegalSubheading>6.1 Within Your Groups</LegalSubheading>
          <LegalParagraph>
            When you join a household group, other group members can see your
            name, profile picture, and the content you share within that group
            (shopping list items, expenses).
          </LegalParagraph>

          <LegalSubheading>6.2 Service Providers</LegalSubheading>
          <LegalParagraph>
            We use third-party services to operate Flatsby:
          </LegalParagraph>
          <LegalList>
            <li>
              <strong>Neon (Database):</strong> Stores your data securely
            </li>
            <li>
              <strong>Vercel (Hosting):</strong> Hosts our web application
            </li>
            <li>
              <strong>Google/Apple (Authentication):</strong> Provides sign-in
              services
            </li>
            <li>
              <strong>AI Services (Vercel AI Gateway):</strong> AI features are
              integrated throughout Flatsby (chat assistant, automatic category
              detection for shopping items, and more). Data is processed via{" "}
              <LegalLink href="https://vercel.com/docs/ai-gateway" external>
                Vercel AI Gateway
              </LegalLink>
              , which routes requests to OpenAI (GPT models), Google (Gemini
              models), or Anthropic (Claude models). See{" "}
              <LegalLink href="https://vercel.com/legal/dpa" external>
                Vercel&apos;s DPA
              </LegalLink>{" "}
              for data processing terms.
            </li>
          </LegalList>

          <LegalSubheading>6.3 Legal Requirements</LegalSubheading>
          <LegalParagraph>
            We may disclose your data if required by law or to protect our
            rights and safety.
          </LegalParagraph>

          <LegalSubheading>6.4 AI Data Processing</LegalSubheading>
          <LegalParagraph>
            AI features are integrated throughout Flatsby. The following data
            may be sent to AI providers:
          </LegalParagraph>
          <LegalList>
            <li>Shopping list item names (for automatic category detection)</li>
            <li>
              Chat messages and conversation history (when using the AI
              assistant)
            </li>
            <li>
              Shopping list and expense data (when using AI assistant tools)
            </li>
            <li>Group member names (when AI needs to identify members)</li>
          </LegalList>
          <LegalParagraph>
            AI providers process this data to provide intelligent features. Data
            processing is governed by Vercel&apos;s DPA linked above.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="data-retention">
          <LegalHeading>7. Data Retention</LegalHeading>
          <LegalParagraph>
            We retain your personal data for as long as your account is active.
            When you delete your account:
          </LegalParagraph>
          <LegalList>
            <li>Your personal data is deleted immediately</li>
            <li>
              Shopping list items and expenses you created may be anonymized but
              retained for other group members
            </li>
            <li>Chat conversations are permanently deleted</li>
          </LegalList>
          <LegalParagraph>
            We may retain certain data longer if required by law or for
            legitimate business purposes (e.g., billing records).
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="your-rights">
          <LegalHeading>8. Your Rights (GDPR)</LegalHeading>
          <LegalParagraph>
            Under the GDPR, you have the right to:
          </LegalParagraph>
          <LegalList>
            <li>
              <strong>Access:</strong> Request a copy of your personal data
            </li>
            <li>
              <strong>Rectification:</strong> Correct inaccurate personal data
            </li>
            <li>
              <strong>Erasure:</strong> Delete your personal data (&quot;right
              to be forgotten&quot;)
            </li>
            <li>
              <strong>Restriction:</strong> Restrict processing of your data
            </li>
            <li>
              <strong>Portability:</strong> Receive your data in a
              machine-readable format
            </li>
            <li>
              <strong>Object:</strong> Object to processing based on legitimate
              interests
            </li>
            <li>
              <strong>Withdraw consent:</strong> Withdraw consent at any time
              for consent-based processing
            </li>
          </LegalList>
          <LegalParagraph>
            To exercise these rights, use the &quot;Export My Data&quot; feature
            in Settings or contact us at support@flatsby.com. You also have the
            right to lodge a complaint with a supervisory authority.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="security">
          <LegalHeading>9. Data Security</LegalHeading>
          <LegalParagraph>
            We implement appropriate technical and organizational measures to
            protect your personal data, including:
          </LegalParagraph>
          <LegalList>
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Encryption of data at rest</li>
            <li>Secure authentication via OAuth 2.0</li>
            <li>Regular security assessments</li>
            <li>Access controls and monitoring</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="international">
          <LegalHeading>10. International Data Transfers</LegalHeading>
          <LegalParagraph>
            Your data may be processed outside the European Economic Area (EEA)
            by our service providers. In particular, AI services (OpenAI,
            Google, Anthropic) process data in the United States. We ensure
            appropriate safeguards are in place, such as Standard Contractual
            Clauses (SCCs) or adequacy decisions. See the DPA link in Section
            6.2 for details.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="children">
          <LegalHeading>11. Children&apos;s Privacy</LegalHeading>
          <LegalParagraph>
            Flatsby is not intended for children under 16 years of age. We do
            not knowingly collect personal data from children under 16. If you
            believe we have collected data from a child, please contact us
            immediately.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="changes">
          <LegalHeading>12. Changes to This Policy</LegalHeading>
          <LegalParagraph>
            We may update this Privacy Policy from time to time. We will notify
            you of material changes by updating the &quot;Last updated&quot;
            date and, where appropriate, by additional notice (e.g., in-app
            notification).
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="contact">
          <LegalHeading>13. Contact Us</LegalHeading>
          <LegalParagraph>
            For privacy-related questions or to exercise your rights, contact
            us:
          </LegalParagraph>
          <LegalParagraph>
            <strong>Email:</strong> support@flatsby.com
          </LegalParagraph>
          <LegalAddress>
            Raphael Mitas
            <br />
            Weiterstädter Str. 65
            <br />
            64291 Darmstadt, Germany
          </LegalAddress>
        </LegalSection>
      </CardContent>
    </Card>
  );
}
