"use client";

import type { TableColumn } from "@flatsby/validators/chat/tools";
import { Table2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@flatsby/ui/table";

interface UITableProps {
  title?: string;
  columns: TableColumn[];
  rows: Record<string, string | number>[];
}

export function UITable({ title, columns, rows }: UITableProps) {
  return (
    <Card className="my-2 w-full max-w-lg">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Table2 className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : ""}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-sm">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((col) => (
                  <TableCell key={col.key} className="text-sm">
                    {row[col.key] ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
