import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy - Flatsby",
  description: "Privacy Policy for Flatsby",
};

const PRIVACY_VERSION = "1.0";
const LAST_UPDATED = "January 2025";

export default function PrivacyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Privacy Policy</CardTitle>
        <CardDescription>
          Version {PRIVACY_VERSION} &middot; Last updated: {LAST_UPDATED}
        </CardDescription>
      </CardHeader>
      <CardContent className="prose dark:prose-invert max-w-none">
        <nav className="mb-8 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <h3 className="mb-2 text-sm font-semibold">Table of Contents</h3>
          <ol className="list-inside list-decimal space-y-1 text-sm">
            <li>
              <a href="#introduction" className="hover:underline">
                Introduction
              </a>
            </li>
            <li>
              <a href="#data-controller" className="hover:underline">
                Data Controller
              </a>
            </li>
            <li>
              <a href="#data-collected" className="hover:underline">
                Data We Collect
              </a>
            </li>
            <li>
              <a href="#legal-basis" className="hover:underline">
                Legal Basis for Processing
              </a>
            </li>
            <li>
              <a href="#data-use" className="hover:underline">
                How We Use Your Data
              </a>
            </li>
            <li>
              <a href="#data-sharing" className="hover:underline">
                Data Sharing
              </a>
            </li>
            <li>
              <a href="#data-retention" className="hover:underline">
                Data Retention
              </a>
            </li>
            <li>
              <a href="#your-rights" className="hover:underline">
                Your Rights (GDPR)
              </a>
            </li>
            <li>
              <a href="#security" className="hover:underline">
                Data Security
              </a>
            </li>
            <li>
              <a href="#international" className="hover:underline">
                International Data Transfers
              </a>
            </li>
            <li>
              <a href="#children" className="hover:underline">
                Children&apos;s Privacy
              </a>
            </li>
            <li>
              <a href="#changes" className="hover:underline">
                Changes to This Policy
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:underline">
                Contact Us
              </a>
            </li>
          </ol>
        </nav>

        <section id="introduction">
          <h2>1. Introduction</h2>
          <p>
            This Privacy Policy explains how Flatsby (&quot;we&quot;,
            &quot;us&quot;, &quot;our&quot;) collects, uses, and protects your
            personal data when you use our household management application. We
            are committed to protecting your privacy and complying with the
            General Data Protection Regulation (GDPR) and other applicable data
            protection laws.
          </p>
        </section>

        <section id="data-controller">
          <h2>2. Data Controller</h2>
          <p>The data controller responsible for your personal data is:</p>
          <address className="not-italic">
            Raphael Mitas
            <br />
            Weiterstädter Str. 65
            <br />
            Darmstadt, Germany
            <br />
            Email: support@flatsby.com
          </address>
        </section>

        <section id="data-collected">
          <h2>3. Data We Collect</h2>

          <h3>3.1 Account Information</h3>
          <p>When you sign up via Google or Apple Sign-In, we receive:</p>
          <ul>
            <li>Your name</li>
            <li>Email address</li>
            <li>Profile picture (if provided)</li>
            <li>Unique identifier from the authentication provider</li>
          </ul>

          <h3>3.2 User-Generated Content</h3>
          <p>Data you create while using the app:</p>
          <ul>
            <li>
              Shopping lists and items (names, categories, completion status)
            </li>
            <li>
              Expenses (amounts, descriptions, dates, categories, split
              information)
            </li>
            <li>Group information (names, member relationships)</li>
            <li>Chat conversations with our AI assistant</li>
          </ul>

          <h3>3.3 Technical Data</h3>
          <p>Automatically collected data:</p>
          <ul>
            <li>IP address (for session management)</li>
            <li>Device type and operating system</li>
            <li>App usage patterns (features used, timestamps)</li>
          </ul>
        </section>

        <section id="legal-basis">
          <h2>4. Legal Basis for Processing</h2>
          <p>We process your personal data based on:</p>
          <ul>
            <li>
              <strong>Contract performance (Art. 6(1)(b) GDPR):</strong> To
              provide the service you signed up for
            </li>
            <li>
              <strong>Consent (Art. 6(1)(a) GDPR):</strong> For optional features
              like AI chat functionality
            </li>
            <li>
              <strong>Legitimate interests (Art. 6(1)(f) GDPR):</strong> For
              service improvement and security
            </li>
            <li>
              <strong>Legal obligations (Art. 6(1)(c) GDPR):</strong> To comply
              with applicable laws
            </li>
          </ul>
        </section>

        <section id="data-use">
          <h2>5. How We Use Your Data</h2>
          <p>We use your personal data to:</p>
          <ul>
            <li>Provide and maintain the Flatsby service</li>
            <li>Enable collaboration with your household members</li>
            <li>Process and display your shopping lists and expenses</li>
            <li>Provide AI-powered assistance (when enabled)</li>
            <li>Send service-related communications</li>
            <li>Improve and optimize the service</li>
            <li>Ensure security and prevent fraud</li>
          </ul>
        </section>

        <section id="data-sharing">
          <h2>6. Data Sharing</h2>

          <h3>6.1 Within Your Groups</h3>
          <p>
            When you join a household group, other group members can see your
            name, profile picture, and the content you share within that group
            (shopping list items, expenses).
          </p>

          <h3>6.2 Service Providers</h3>
          <p>We use third-party services to operate Flatsby:</p>
          <ul>
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
              <strong>AI Providers (OpenRouter):</strong> Powers the AI chat
              feature (only when you use it)
            </li>
          </ul>

          <h3>6.3 Legal Requirements</h3>
          <p>
            We may disclose your data if required by law or to protect our
            rights and safety.
          </p>
        </section>

        <section id="data-retention">
          <h2>7. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active.
            When you delete your account:
          </p>
          <ul>
            <li>Your personal data is deleted immediately</li>
            <li>
              Shopping list items and expenses you created may be anonymized but
              retained for other group members
            </li>
            <li>
              Chat conversations are permanently deleted
            </li>
          </ul>
          <p>
            We may retain certain data longer if required by law or for
            legitimate business purposes (e.g., billing records).
          </p>
        </section>

        <section id="your-rights">
          <h2>8. Your Rights (GDPR)</h2>
          <p>Under the GDPR, you have the right to:</p>
          <ul>
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
          </ul>
          <p>
            To exercise these rights, use the &quot;Export My Data&quot; feature
            in Settings or contact us at support@flatsby.com. You also have the
            right to lodge a complaint with a supervisory authority.
          </p>
        </section>

        <section id="security">
          <h2>9. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to
            protect your personal data, including:
          </p>
          <ul>
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Encryption of data at rest</li>
            <li>Secure authentication via OAuth 2.0</li>
            <li>Regular security assessments</li>
            <li>Access controls and monitoring</li>
          </ul>
        </section>

        <section id="international">
          <h2>10. International Data Transfers</h2>
          <p>
            Your data may be processed outside the European Economic Area (EEA)
            by our service providers. We ensure appropriate safeguards are in
            place, such as Standard Contractual Clauses or adequacy decisions.
          </p>
        </section>

        <section id="children">
          <h2>11. Children&apos;s Privacy</h2>
          <p>
            Flatsby is not intended for children under 16 years of age. We do
            not knowingly collect personal data from children under 16. If you
            believe we have collected data from a child, please contact us
            immediately.
          </p>
        </section>

        <section id="changes">
          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of material changes by updating the &quot;Last updated&quot;
            date and, where appropriate, by additional notice (e.g., in-app
            notification).
          </p>
        </section>

        <section id="contact">
          <h2>13. Contact Us</h2>
          <p>
            For privacy-related questions or to exercise your rights, contact
            us:
          </p>
          <p>
            <strong>Email:</strong> support@flatsby.com
          </p>
          <address className="not-italic">
            Raphael Mitas
            <br />
            Weiterstädter Str. 65
            <br />
            Darmstadt, Germany
          </address>
        </section>
      </CardContent>
    </Card>
  );
}
