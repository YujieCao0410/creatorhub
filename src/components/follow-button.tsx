"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { FollowState } from "@/lib/dto";

export function FollowButton({
  handle,
  initialFollowing,
  canInteract,
}: {
  handle: string;
  initialFollowing: boolean;
  canInteract: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!canInteract) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pending) return;
    setPending(true);

    const next = !following;
    setFollowing(next);
    try {
      const state = next
        ? await api.post<FollowState>(`/api/creators/${handle}/follow`)
        : await api.delete<FollowState>(`/api/creators/${handle}/follow`);
      setFollowing(state.following);
      router.refresh();
    } catch {
      setFollowing(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      size="sm"
      onClick={toggle}
      loading={pending}
    >
      {following ? t("creator.unfollow") : t("creator.follow")}
    </Button>
  );
}
