"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@flatsby/ui/button";

import { useTRPC } from "~/trpc/react";

export default function ExportUserData() {
  const trpc = useTRPC();
  const [isExporting, setIsExporting] = useState(false);

  const { refetch } = useQuery({
    ...trpc.user.exportUserData.queryOptions(),
    enabled: false,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await refetch();
      if (result.data?.success) {
        const data = result.data.data;
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `flatsby-data-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting} variant="outline">
      {isExporting ? "Exporting..." : "Export My Data"}
    </Button>
  );
}
