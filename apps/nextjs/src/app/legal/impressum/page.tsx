import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";

export const metadata: Metadata = {
  title: "Impressum - Flatsby",
  description: "Legal notice (Impressum) for Flatsby as required by German law",
};

export default function ImpressumPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          Impressum (Legal Notice)
        </CardTitle>
        <CardDescription>
          Information according to &sect;5 TMG (German Telemedia Act)
        </CardDescription>
      </CardHeader>
      <CardContent className="prose dark:prose-invert max-w-none">
        <section>
          <h2>Service Provider</h2>
          <address className="not-italic">
            Raphael Mitas
            <br />
            Weiterstädter Str. 65
            <br />
            64289 Darmstadt
            <br />
            Germany
          </address>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            <strong>Email:</strong>{" "}
            <a href="mailto:support@flatsby.com">support@flatsby.com</a>
          </p>
        </section>

        <section>
          <h2>Responsible for Content</h2>
          <p>
            Responsible for content according to &sect;18 Abs. 2 MStV (German
            Interstate Media Treaty):
          </p>
          <address className="not-italic">
            Raphael Mitas
            <br />
            Weiterstädter Str. 65
            <br />
            64289 Darmstadt
            <br />
            Germany
          </address>
        </section>

        <section>
          <h2>EU Dispute Resolution</h2>
          <p>
            The European Commission provides a platform for online dispute
            resolution (ODR):{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p>
            We are neither obligated nor willing to participate in dispute
            resolution proceedings before a consumer arbitration board.
          </p>
        </section>

        <section>
          <h2>Liability for Content</h2>
          <p>
            As a service provider, we are responsible for our own content on
            these pages in accordance with &sect;7 Abs.1 TMG (German Telemedia
            Act). According to &sect;&sect;8 to 10 TMG, however, we as a service
            provider are not obligated to monitor transmitted or stored
            third-party information or to investigate circumstances that
            indicate illegal activity.
          </p>
          <p>
            Obligations to remove or block the use of information under general
            law remain unaffected. However, liability in this regard is only
            possible from the point in time at which we become aware of a
            specific legal violation. If we become aware of such legal
            violations, we will remove this content immediately.
          </p>
        </section>

        <section>
          <h2>Liability for Links</h2>
          <p>
            Our offer contains links to external third-party websites over whose
            content we have no influence. Therefore, we cannot assume any
            liability for these external contents. The respective provider or
            operator of the pages is always responsible for the content of the
            linked pages. The linked pages were checked for possible legal
            violations at the time of linking. Illegal content was not
            recognizable at the time of linking.
          </p>
          <p>
            However, permanent content control of the linked pages is not
            reasonable without concrete evidence of a legal violation. If we
            become aware of legal violations, we will remove such links
            immediately.
          </p>
        </section>

        <section>
          <h2>Copyright</h2>
          <p>
            The content and works created by the site operators on these pages
            are subject to German copyright law. Duplication, processing,
            distribution, and any kind of exploitation outside the limits of
            copyright require the written consent of the respective author or
            creator. Downloads and copies of this site are only permitted for
            private, non-commercial use.
          </p>
          <p>
            Insofar as the content on this site was not created by the operator,
            the copyrights of third parties are respected. In particular,
            third-party content is marked as such. Should you nevertheless
            become aware of a copyright infringement, please inform us
            accordingly. If we become aware of legal violations, we will remove
            such content immediately.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
