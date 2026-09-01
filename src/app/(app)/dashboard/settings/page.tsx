import Link from "next/link";
import { Card } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Account</h1>
        <p className="text-sm text-muted">Your account details.</p>
      </div>

      <Card className="divide-y divide-border p-0">
        <Row label="Name" value={user.name} />
        <Row label="Handle" value={`@${user.handle}`} />
        <Row label="Email" value={user.email} />
        <Row label="Plan" value={user.membership === "PRO" ? "Pro" : "Free"} />
        <Row
          label="Member since"
          value={new Date(user.createdAt).toLocaleDateString()}
        />
      </Card>

      <Card>
        <h2 className="font-medium">Membership</h2>
        <p className="mt-1 text-sm text-muted">
          Manage your plan on the{" "}
          <Link href="/dashboard/membership" className="text-brand-600">
            Membership
          </Link>{" "}
          page.
        </p>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
