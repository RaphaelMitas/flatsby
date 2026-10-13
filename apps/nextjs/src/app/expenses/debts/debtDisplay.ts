export function amountTone(cents: number): string {
  if (cents > 0) return "text-success";
  if (cents < 0) return "text-destructive";
  return "text-muted-foreground";
}
