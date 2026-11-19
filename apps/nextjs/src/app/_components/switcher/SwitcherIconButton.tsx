import type { LucideIcon } from "lucide-react";
import Link from "next/link";

const className =
  "bg-card hover:bg-muted flex shrink-0 items-center rounded-2xl border p-2.5 shadow-sm transition-colors";

export function SwitcherIconButton({
  testId,
  label,
  icon: Icon,
  ...target
}: { testId: string; label: string; icon: LucideIcon } & (
  { href: string; onClick?: () => void } | { onClick: () => void }
)) {
  const icon = <Icon className="m-2.5 size-5" />;

  return "href" in target ? (
    <Link
      href={target.href}
      onClick={target.onClick}
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
