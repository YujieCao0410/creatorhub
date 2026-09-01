import { prisma } from "@/lib/db";
import type { Membership, MembershipInfo } from "@/lib/dto";
import { draftLimitFor, toMembership } from "@/lib/membership";

export type { MembershipInfo } from "@/lib/dto";

/** Everything the dashboard membership page needs, in one call. */
export async function getMembershipInfo(
  userId: string,
): Promise<MembershipInfo> {
  const [user, drafts] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        membership: true,
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
      },
    }),
    prisma.post.count({ where: { authorId: userId, published: false } }),
  ]);

  const membership = toMembership(user.membership);

  return {
    membership,
    subscription: user.subscription
      ? {
          status: user.subscription.status,
          currentPeriodEnd:
            user.subscription.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
        }
      : null,
    usage: { drafts, draftLimit: draftLimitFor(membership) },
  };
}

/**
 * Sets a user's effective plan. Called by the Stripe webhook (Phase 9) and by
 * tests. Keeps the denormalized `User.membership` in sync with billing state.
 */
export async function setMembership(
  userId: string,
  membership: Membership,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { membership },
  });
}
