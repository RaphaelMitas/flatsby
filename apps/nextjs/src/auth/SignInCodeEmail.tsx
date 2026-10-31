import type { Locale } from "@flatsby/i18n/locale";
import type { CSSProperties } from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

import { SITE_URL } from "~/app/_components/landing/content";

interface SignInCodeEmailProps {
  locale: Locale;
  code: string;
  preview: string;
  heading: string;
  intro: string;
  footnote: string;
}

export function SignInCodeEmail({
  locale,
  code,
  preview,
  heading,
  intro,
  footnote,
}: SignInCodeEmailProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body lang={locale} style={body}>
        <Container style={container}>
          {/* Gmail and Outlook drop negative margins, so the card's top edge is drawn around the logo */}
          <Row>
            <Column style={edge}>
              <div style={{ ...cardTop, borderTopLeftRadius: "18px" }} />
            </Column>
            <Column style={logoCell}>
              <Img
                src={`${SITE_URL}/apple-touch-icon.png`}
                width="72"
                height="72"
                alt="Flatsby"
                style={logo}
              />
            </Column>
            <Column style={edge}>
              <div style={{ ...cardTop, borderTopRightRadius: "18px" }} />
            </Column>
          </Row>
          <Section style={card}>
            <Heading as="h1" style={title}>
              {heading}
            </Heading>
            <Text style={paragraph}>{intro}</Text>
            <Text style={codeStyle}>{code}</Text>
            <Text style={footnoteStyle}>{footnote}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  margin: 0,
  padding: "24px 16px",
  backgroundColor: "#f4f4f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  color: "#09090b",
};

const container = { maxWidth: "480px" };

const edge = { verticalAlign: "bottom" };

const cardTop = { height: "36px", backgroundColor: "#ffffff" };

const logoCell = {
  width: "72px",
  backgroundColor: "#ffffff",
  backgroundImage: "linear-gradient(#f4f4f5 50%, #ffffff 50%)",
};

const logo = { display: "block", borderRadius: "50%" };

const card: CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "0 0 18px 18px",
  padding: "4px 24px 24px",
  textAlign: "center",
};

const title = { fontSize: "20px", margin: "0 0 6px" };

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.5",
  margin: "0 0 18px",
  color: "#3f3f46",
};

const codeStyle = {
  backgroundColor: "#09090b",
  color: "#ffffff",
  borderRadius: "12px",
  padding: "16px",
  fontSize: "30px",
  lineHeight: "38px",
  fontWeight: 700,
  letterSpacing: "8px",
  margin: 0,
  fontFamily: "ui-monospace, Menlo, monospace",
};

const footnoteStyle = {
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "12px 0 0",
  color: "#71717a",
};
