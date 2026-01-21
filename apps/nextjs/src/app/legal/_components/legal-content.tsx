interface LegalSectionProps {
  id?: string;
  children: React.ReactNode;
}

export function LegalSection({ id, children }: LegalSectionProps) {
  return (
    <section id={id} className="mb-10 space-y-4 last:mb-0">
      {children}
    </section>
  );
}

interface LegalHeadingProps {
  children: React.ReactNode;
}

export function LegalHeading({ children }: LegalHeadingProps) {
  return <h2 className="text-xl font-semibold">{children}</h2>;
}

interface LegalSubheadingProps {
  children: React.ReactNode;
}

export function LegalSubheading({ children }: LegalSubheadingProps) {
  return <h3 className="text-lg font-medium">{children}</h3>;
}

interface LegalParagraphProps {
  children: React.ReactNode;
}

export function LegalParagraph({ children }: LegalParagraphProps) {
  return <p className="text-muted-foreground leading-relaxed">{children}</p>;
}

interface LegalListProps {
  children: React.ReactNode;
  ordered?: boolean;
}

export function LegalList({ children, ordered = false }: LegalListProps) {
  const Component = ordered ? "ol" : "ul";
  const listStyle = ordered ? "list-decimal" : "list-disc";

  return (
    <Component
      className={`text-muted-foreground ml-6 space-y-2 ${listStyle} leading-relaxed`}
    >
      {children}
    </Component>
  );
}

interface LegalAddressProps {
  children: React.ReactNode;
}

export function LegalAddress({ children }: LegalAddressProps) {
  return (
    <address className="text-muted-foreground not-italic leading-relaxed">
      {children}
    </address>
  );
}

interface LegalLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

export function LegalLink({ href, children, external = false }: LegalLinkProps) {
  return (
    <a
      href={href}
      className="text-primary underline underline-offset-4 hover:text-primary/80"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {children}
    </a>
  );
}
