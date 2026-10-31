import type { Locale } from "@flatsby/i18n/locale";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "react-email";

interface SignInCodeEmailProps {
  locale: Locale;
  code: string;
  heading: string;
  intro: string;
  expiry: string;
  ignore: string;
}

export function SignInCodeEmail({
  locale,
  code,
  heading,
  intro,
  expiry,
  ignore,
}: SignInCodeEmailProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{`${intro} ${code}`}</Preview>
      <Body lang={locale} style={body}>
        <Container style={card}>
          <Heading as="h1" style={title}>
            {heading}
          </Heading>
          <Text style={paragraph}>{intro}</Text>
          <Text style={codeStyle}>{code}</Text>
          <Text style={paragraph}>{expiry}</Text>
          <Text style={footnote}>{ignore}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  margin: 0,
  padding: "24px",
  backgroundColor: "#f4f4f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  color: "#09090b",
};

const card = {
  maxWidth: "480px",
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "32px",
};

const title = { fontSize: "20px", margin: "0 0 16px" };

const paragraph = { fontSize: "15px", lineHeight: "1.5", margin: "0 0 16px" };

const codeStyle = {
  fontSize: "32px",
  lineHeight: "40px",
  fontWeight: 700,
  letterSpacing: "8px",
  margin: "0 0 16px",
  fontFamily: "ui-monospace, Menlo, monospace",
};

const footnote = {
  fontSize: "13px",
  lineHeight: "1.5",
  margin: 0,
  color: "#71717a",
};
