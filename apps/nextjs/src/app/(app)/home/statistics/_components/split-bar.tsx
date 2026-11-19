import { cn } from "@flatsby/ui";

export function SplitBar({
  segments,
}: {
  segments: { key: string; value: number; className: string }[];
}) {
  return (
    <div className="mt-4 flex h-3 gap-0.5" aria-hidden>
      {segments
        .filter(({ value }) => value > 0)
        .map(({ key, value, className }) => (
          <span
            key={key}
            className={cn(
              "rounded-sm first:rounded-l-md last:rounded-r-md",
              className,
            )}
            style={{ flexGrow: value, flexBasis: 0 }}
          />
        ))}
    </div>
  );
}
