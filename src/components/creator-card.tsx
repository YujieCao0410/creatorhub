import Link from "next/link";
import { Avatar } from "@/components/ui/misc";
import type { PublicUser } from "@/lib/dto";

export function CreatorCard({ creator }: { creator: PublicUser }) {
  return (
    <Link
      href={`/creators/${creator.handle}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
    >
      <Avatar name={creator.name} src={creator.avatarUrl} size={44} />
      <div className="min-w-0">
        <p className="font-medium">{creator.name}</p>
        <p className="text-sm text-muted">@{creator.handle}</p>
        {creator.bio && (
          <p className="mt-0.5 line-clamp-1 text-sm text-muted">{creator.bio}</p>
        )}
      </div>
    </Link>
  );
}
