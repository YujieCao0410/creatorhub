import { Badge, Card } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";

/**
 * Placeholder until Phase 8 (membership model) and Phase 9 (Stripe). The
 * "current plan" is hard-coded to Free here; it becomes real once the User
 * model carries a membership column.
 */
export default async function MembershipPage() {
  await requireUser();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Membership</h1>
        <p className="text-sm text-muted">Your current plan and billing.</p>
      </div>

      <Card className="flex items-center justify-between">
        <div>
          <p className="font-medium">Free plan</p>
          <p className="text-sm text-muted">
            Publishing, following, and the feed.
          </p>
        </div>
        <Badge>Current</Badge>
      </Card>

      <Card className="opacity-70">
        <div className="flex items-center justify-between">
          <p className="font-medium">Pro plan</p>
          <Badge tone="brand">Coming soon</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          Upgrading with Stripe Checkout arrives in a later phase.
        </p>
      </Card>
    </div>
  );
}
