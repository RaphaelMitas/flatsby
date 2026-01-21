import Link from "next/link";

import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";

import { prefetch, trpc } from "~/trpc/server";
import DeleteUser from "./DeleteUser";
import ExportUserData from "./ExportUserData";
import ManageUser from "./ManageUser";

export default function Page() {
  prefetch(trpc.user.getCurrentUser.queryOptions());
  return (
    <div className="flex flex-col p-4 md:pt-16">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 lg:grid-cols-[1fr]">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold">User Settings</h1>
        </div>
        <ManageUser />
        <Card>
          <CardHeader>
            <CardTitle>Billing & Subscription</CardTitle>
            <CardDescription>
              Manage your subscription and payment methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/billing">
              <Button>Manage Billing</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Legal & Privacy</CardTitle>
            <CardDescription>
              Review our legal documents and policies
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/legal/terms">
              <Button variant="outline">Terms of Service</Button>
            </Link>
            <Link href="/legal/privacy">
              <Button variant="outline">Privacy Policy</Button>
            </Link>
            <Link href="/legal/impressum">
              <Button variant="outline">Impressum</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your Data</CardTitle>
            <CardDescription>
              Download a copy of your personal data (GDPR Article 20)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExportUserData />
          </CardContent>
        </Card>
        <DeleteUser />
      </div>
    </div>
  );
}
