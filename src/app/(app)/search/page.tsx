import type { Metadata } from "next";
import { CreatorCard } from "@/components/creator-card";
import { PostCard } from "@/components/post-card";
import { SearchBox } from "@/components/search-box";
import { EmptyState } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { searchQuerySchema } from "@/lib/validation/search";
import { searchPosts } from "@/server/services/post-service";
import { searchCreators } from "@/server/services/user-service";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const raw = (await searchParams).q ?? "";
  const parsed = searchQuerySchema.safeParse({ q: raw });
  const viewer = await getCurrentUser();

  const results = parsed.success
    ? await Promise.all([
        searchCreators(parsed.data.q),
        searchPosts(parsed.data.q, viewer?.id),
      ])
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Search</h1>
        <SearchBox initialQuery={raw} autoFocus />
      </div>

      {!parsed.success ? (
        raw.trim().length > 0 ? (
          <p className="text-sm text-muted">
            Enter at least 2 characters to search.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Search for creators by name or handle, and posts by title or content.
          </p>
        )
      ) : (
        <SearchResults
          creators={results![0]}
          posts={results![1]}
          query={parsed.data.q}
          currentUserId={viewer?.id}
        />
      )}
    </div>
  );
}

function SearchResults({
  creators,
  posts,
  query,
  currentUserId,
}: {
  creators: Awaited<ReturnType<typeof searchCreators>>;
  posts: Awaited<ReturnType<typeof searchPosts>>;
  query: string;
  currentUserId?: string;
}) {
  if (creators.length === 0 && posts.length === 0) {
    return (
      <EmptyState
        title={`No results for "${query}"`}
        description="Try a different search term."
      />
    );
  }

  return (
    <div className="space-y-8">
      {creators.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Creators
          </h2>
          <div className="space-y-2">
            {creators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Posts
          </h2>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
