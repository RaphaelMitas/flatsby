import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";

import {
  LegalHeading,
  LegalList,
  LegalParagraph,
  LegalSection,
} from "../_components/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service - Flatsby",
  description: "Terms of Service for using Flatsby",
};

const TERMS_VERSION = "1.0";
const LAST_UPDATED = "January 2026";

function TableOfContents() {
  const items = [
    { id: "acceptance", label: "Acceptance of Terms" },
    { id: "description", label: "Description of Service" },
    { id: "accounts", label: "User Accounts" },
    { id: "conduct", label: "User Conduct" },
    { id: "content", label: "User Content" },
    { id: "termination", label: "Termination" },
    { id: "disclaimer", label: "Disclaimer of Warranties" },
    { id: "liability", label: "Limitation of Liability" },
    { id: "changes", label: "Changes to Terms" },
    { id: "contact", label: "Contact Information" },
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

export default function TermsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Terms of Service</CardTitle>
        <CardDescription>
          Version {TERMS_VERSION} · Last updated: {LAST_UPDATED}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TableOfContents />

        <LegalSection id="acceptance">
          <LegalHeading>1. Acceptance of Terms</LegalHeading>
          <LegalParagraph>
            By accessing or using Flatsby (&quot;the Service&quot;), you agree
            to be bound by these Terms of Service. If you do not agree to these
            terms, please do not use the Service.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="description">
          <LegalHeading>2. Description of Service</LegalHeading>
          <LegalParagraph>
            Flatsby is a collaborative household management application that
            enables users to:
          </LegalParagraph>
          <LegalList>
            <li>Create and manage shared shopping lists</li>
            <li>Track and split expenses among household members</li>
            <li>Organize household groups</li>
            <li>Use AI-powered assistance for household tasks</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="accounts">
          <LegalHeading>3. User Accounts</LegalHeading>
          <LegalParagraph>
            To use the Service, you must create an account using Google or Apple
            Sign-In. You are responsible for:
          </LegalParagraph>
          <LegalList>
            <li>Maintaining the security of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
          </LegalList>
          <LegalParagraph>
            You must be at least 16 years old to create an account and use the
            Service.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="conduct">
          <LegalHeading>4. User Conduct</LegalHeading>
          <LegalParagraph>You agree not to:</LegalParagraph>
          <LegalList>
            <li>Use the Service for any unlawful purpose</li>
            <li>Harass, abuse, or harm other users</li>
            <li>
              Attempt to gain unauthorized access to the Service or its systems
            </li>
            <li>Transmit malware, viruses, or other malicious code</li>
            <li>
              Interfere with or disrupt the integrity or performance of the
              Service
            </li>
            <li>Violate the privacy of other users</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="content">
          <LegalHeading>5. User Content</LegalHeading>
          <LegalParagraph>
            You retain ownership of any content you submit to the Service
            (shopping lists, expenses, group names, etc.). By submitting
            content, you grant us a license to use, store, and process that
            content solely to provide the Service to you.
          </LegalParagraph>
          <LegalParagraph>
            You are solely responsible for the content you submit and must
            ensure it does not violate any laws or third-party rights.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="termination">
          <LegalHeading>6. Termination</LegalHeading>
          <LegalParagraph>
            You may delete your account at any time through the app settings. We
            may suspend or terminate your account if you violate these Terms.
          </LegalParagraph>
          <LegalParagraph>
            Upon termination, your right to use the Service will immediately
            cease. We may retain certain data as required by law or for
            legitimate business purposes.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="disclaimer">
          <LegalHeading>7. Disclaimer of Warranties</LegalHeading>
          <LegalParagraph>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
            AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
            IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="liability">
          <LegalHeading>8. Limitation of Liability</LegalHeading>
          <LegalParagraph>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL FLATSBY OR
            ITS OPERATOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
            REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF
            DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="changes">
          <LegalHeading>9. Changes to Terms</LegalHeading>
          <LegalParagraph>
            We reserve the right to modify these Terms at any time. We will
            notify you of material changes by posting the new Terms on this page
            and updating the &quot;Last updated&quot; date. Your continued use
            of the Service after such changes constitutes acceptance of the new
            Terms.
          </LegalParagraph>
        </LegalSection>

        <LegalSection id="contact">
          <LegalHeading>10. Contact Information</LegalHeading>
          <LegalParagraph>
            If you have any questions about these Terms, please contact us at:
          </LegalParagraph>
          <LegalParagraph>
            <strong>Email:</strong> support@flatsby.com
          </LegalParagraph>
        </LegalSection>
      </CardContent>
    </Card>
  );
}
