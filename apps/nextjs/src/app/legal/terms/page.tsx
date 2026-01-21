import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service - Flatsby",
  description: "Terms of Service for using Flatsby",
};

const TERMS_VERSION = "1.0";
const LAST_UPDATED = "January 2025";

export default function TermsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Terms of Service</CardTitle>
        <CardDescription>
          Version {TERMS_VERSION} &middot; Last updated: {LAST_UPDATED}
        </CardDescription>
      </CardHeader>
      <CardContent className="prose dark:prose-invert max-w-none">
        <nav className="mb-8 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <h3 className="mb-2 text-sm font-semibold">Table of Contents</h3>
          <ol className="list-inside list-decimal space-y-1 text-sm">
            <li>
              <a href="#acceptance" className="hover:underline">
                Acceptance of Terms
              </a>
            </li>
            <li>
              <a href="#description" className="hover:underline">
                Description of Service
              </a>
            </li>
            <li>
              <a href="#accounts" className="hover:underline">
                User Accounts
              </a>
            </li>
            <li>
              <a href="#conduct" className="hover:underline">
                User Conduct
              </a>
            </li>
            <li>
              <a href="#content" className="hover:underline">
                User Content
              </a>
            </li>
            <li>
              <a href="#termination" className="hover:underline">
                Termination
              </a>
            </li>
            <li>
              <a href="#disclaimer" className="hover:underline">
                Disclaimer of Warranties
              </a>
            </li>
            <li>
              <a href="#liability" className="hover:underline">
                Limitation of Liability
              </a>
            </li>
            <li>
              <a href="#changes" className="hover:underline">
                Changes to Terms
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:underline">
                Contact Information
              </a>
            </li>
          </ol>
        </nav>

        <section id="acceptance">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Flatsby (&quot;the Service&quot;), you agree
            to be bound by these Terms of Service. If you do not agree to these
            terms, please do not use the Service.
          </p>
        </section>

        <section id="description">
          <h2>2. Description of Service</h2>
          <p>
            Flatsby is a collaborative household management application that
            enables users to:
          </p>
          <ul>
            <li>Create and manage shared shopping lists</li>
            <li>Track and split expenses among household members</li>
            <li>Organize household groups</li>
            <li>Use AI-powered assistance for household tasks</li>
          </ul>
        </section>

        <section id="accounts">
          <h2>3. User Accounts</h2>
          <p>
            To use the Service, you must create an account using Google or Apple
            Sign-In. You are responsible for:
          </p>
          <ul>
            <li>Maintaining the security of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
          </ul>
          <p>
            You must be at least 16 years old to create an account and use the
            Service.
          </p>
        </section>

        <section id="conduct">
          <h2>4. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
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
          </ul>
        </section>

        <section id="content">
          <h2>5. User Content</h2>
          <p>
            You retain ownership of any content you submit to the Service
            (shopping lists, expenses, group names, etc.). By submitting
            content, you grant us a license to use, store, and process that
            content solely to provide the Service to you.
          </p>
          <p>
            You are solely responsible for the content you submit and must
            ensure it does not violate any laws or third-party rights.
          </p>
        </section>

        <section id="termination">
          <h2>6. Termination</h2>
          <p>
            You may delete your account at any time through the app settings. We
            may suspend or terminate your account if you violate these Terms.
          </p>
          <p>
            Upon termination, your right to use the Service will immediately
            cease. We may retain certain data as required by law or for
            legitimate business purposes.
          </p>
        </section>

        <section id="disclaimer">
          <h2>7. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
            AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
            IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT.
          </p>
        </section>

        <section id="liability">
          <h2>8. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL FLATSBY OR
            ITS OPERATOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
            REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF
            DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
          </p>
        </section>

        <section id="changes">
          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will
            notify you of material changes by posting the new Terms on this page
            and updating the &quot;Last updated&quot; date. Your continued use
            of the Service after such changes constitutes acceptance of the new
            Terms.
          </p>
        </section>

        <section id="contact">
          <h2>10. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> support@flatsby.com
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
