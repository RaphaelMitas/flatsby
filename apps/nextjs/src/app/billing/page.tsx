import { BillingContent } from "./_components/billing-content";

export default function BillingPage() {
  return (
    <div className="flex flex-col p-4 md:pt-16">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <h1 className="text-3xl font-semibold">Billing & Subscription</h1>
        <BillingContent />
      </div>
    </div>
  );
}
