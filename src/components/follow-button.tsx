"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
      {following ? "Following" : "Follow"}
    </Button>
  );
}
