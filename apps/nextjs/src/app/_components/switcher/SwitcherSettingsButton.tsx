import Link from "next/link";
import { Settings } from "lucide-react";

const className =
  "bg-card hover:bg-muted flex aspect-square shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-colors";

export function SwitcherSettingsButton({
  testId,
  label,
  ...target
}: { testId: string; label: string } & (
  { href: string } | { onClick: () => void }
)) {
  const icon = <Settings className="size-5" />;

  return "href" in target ? (
    <Link
      href={target.href}
      data-testid={testId}
      aria-label={label}
      className={className}
    >
      {icon}
    </Link>
  ) : (
    <button
      type="button"
      onClick={target.onClick}
      data-testid={testId}
      aria-label={label}
      className={className}
    >
      {icon}
    </button>
  );
}
