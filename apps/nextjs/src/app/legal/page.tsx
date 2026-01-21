import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@flatsby/ui/card";

export const metadata: Metadata = {
  title: "Legal - Flatsby",
  description: "Legal information for Flatsby",
};

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Legal Information</h1>
        <p className="text-muted-foreground mt-2">
          Important legal documents and policies for using Flatsby
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/legal/terms">
          <Card className="h-full transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
            <CardHeader>
              <CardTitle>Terms of Service</CardTitle>
              <CardDescription>
                The rules and guidelines for using Flatsby
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/legal/privacy">
          <Card className="h-full transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
              <CardDescription>
                How we collect, use, and protect your data
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/legal/legal-notice">
          <Card className="h-full transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
            <CardHeader>
              <CardTitle>Legal Notice</CardTitle>
              <CardDescription>
                Legal notice as required by German law
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
