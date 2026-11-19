import { cn } from "@flatsby/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@flatsby/ui/tooltip";

export function SplitBar({
  segments,
  lit,
  onLit,
  onPick,
}: {
  segments: {
    key: string;
    value: number;
    className: string;
    label: string;
    tooltip?: React.ReactNode;
  }[];
  lit: string | null;
  onLit: (key: string | null) => void;
  onPick: (key: string) => void;
}) {
  return (
    <div className="mt-4 flex h-3 items-center gap-0.5">
      {segments
        .filter(({ value }) => value > 0)
        .map(({ key, value, className, label, tooltip }) => (
          <Tooltip key={key} open={tooltip !== undefined && lit === key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label}
                onClick={() => onPick(key)}
                onPointerEnter={() => onLit(key)}
                onPointerLeave={() => onLit(null)}
                className={cn(
                  "h-3 transition-[flex-grow,opacity,scale] duration-300 ease-out first:rounded-l-md last:rounded-r-md motion-reduce:transition-none",
                  className,
                  lit === key && "scale-y-125",
                  lit !== null && lit !== key && "opacity-30",
                )}
                style={{ flexGrow: value, flexBasis: 0 }}
              />
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        ))}
    </div>
  );
}
