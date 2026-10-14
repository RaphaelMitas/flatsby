import {
  rootMetadata,
  RootShell,
  rootViewport,
} from "~/app/_components/RootShell";
import { EnglishIntlProvider } from "./EnglishIntlProvider";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function MarketingLayout(props: { children: React.ReactNode }) {
  return (
    <RootShell lang="en">
      <EnglishIntlProvider>{props.children}</EnglishIntlProvider>
    </RootShell>
  );
}
