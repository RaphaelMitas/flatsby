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
  LegalParagraph,
  LegalSection,
} from "../_components/legal-content";

export const metadata: Metadata = {
  title: "Impressum - Flatsby",
  description: "Legal notice (Impressum) for Flatsby as required by German law",
};

export default function ImpressumPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Impressum (Legal Notice)</CardTitle>
        <CardDescription>
          Information according to §5 DDG (Digitale-Dienste-Gesetz)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LegalSection>
          <LegalHeading>Service Provider</LegalHeading>
          <LegalAddress>
            Raphael Mitas
            <br />
            Weiterstädter Str. 65
            <br />
            64291 Darmstadt
            <br />
            Germany
          </LegalAddress>
        </LegalSection>

        <LegalSection>
          <LegalHeading>Contact</LegalHeading>
          <LegalParagraph>
            <strong>Phone:</strong> +49 15679 769941
          </LegalParagraph>
          <LegalParagraph>
            <strong>Email:</strong>{" "}
            <LegalLink href="mailto:support@flatsby.com">
              support@flatsby.com
            </LegalLink>
          </LegalParagraph>
        </LegalSection>

        <LegalSection>
          <LegalHeading>Responsible for Content</LegalHeading>
          <LegalParagraph>
            Responsible for content according to §18 Abs. 2 MStV (German
            Interstate Media Treaty):
          </LegalParagraph>
          <LegalAddress>
            Raphael Mitas
            <br />
            Weiterstädter Str. 65
            <br />
            64291 Darmstadt
            <br />
            Germany
          </LegalAddress>
        </LegalSection>

        <LegalSection>
          <LegalHeading>Consumer Dispute Resolution</LegalHeading>
          <LegalParagraph>
            We are neither obligated nor willing to participate in dispute
            resolution proceedings before a consumer arbitration board.
          </LegalParagraph>
        </LegalSection>

        <LegalSection>
          <LegalHeading>Liability for Content</LegalHeading>
          <LegalParagraph>
            As a service provider, we are responsible for our own content on
            these pages in accordance with §7 Abs.1 DDG
            (Digitale-Dienste-Gesetz). According to §§8 bis 10 DDG, however, we
            as a service provider are not obligated to monitor transmitted or
            stored third-party information or to investigate circumstances that
            indicate illegal activity.
          </LegalParagraph>
          <LegalParagraph>
            Obligations to remove or block the use of information under general
            law remain unaffected. However, liability in this regard is only
            possible from the point in time at which we become aware of a
            specific legal violation. If we become aware of such legal
            violations, we will remove this content immediately.
          </LegalParagraph>
        </LegalSection>

        <LegalSection>
          <LegalHeading>Liability for Links</LegalHeading>
          <LegalParagraph>
            Our offer contains links to external third-party websites over whose
            content we have no influence. Therefore, we cannot assume any
            liability for these external contents. The respective provider or
            operator of the pages is always responsible for the content of the
            linked pages. The linked pages were checked for possible legal
            violations at the time of linking. Illegal content was not
            recognizable at the time of linking.
          </LegalParagraph>
          <LegalParagraph>
            However, permanent content control of the linked pages is not
            reasonable without concrete evidence of a legal violation. If we
            become aware of legal violations, we will remove such links
            immediately.
          </LegalParagraph>
        </LegalSection>

        <LegalSection>
          <LegalHeading>Copyright</LegalHeading>
          <LegalParagraph>
            The content and works created by the site operators on these pages
            are subject to German copyright law. Duplication, processing,
            distribution, and any kind of exploitation outside the limits of
            copyright require the written consent of the respective author or
            creator. Downloads and copies of this site are only permitted for
            private, non-commercial use.
          </LegalParagraph>
          <LegalParagraph>
            Insofar as the content on this site was not created by the operator,
            the copyrights of third parties are respected. In particular,
            third-party content is marked as such. Should you nevertheless
            become aware of a copyright infringement, please inform us
            accordingly. If we become aware of legal violations, we will remove
            such content immediately.
          </LegalParagraph>
        </LegalSection>
      </CardContent>
    </Card>
  );
}
