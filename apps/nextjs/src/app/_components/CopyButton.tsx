"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";

export function CopyButton({
  value,
  onCopy,
}: {
  value: string;
  onCopy?: () => void;
}) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button type="button" size="sm" variant="outline" onClick={copy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? t("common.copied") : t("common.copy")}
    </Button>
  );
}
