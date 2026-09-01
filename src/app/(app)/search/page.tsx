import type { Metadata } from "next";
import { CreatorCard } from "@/components/creator-card";
import { PostCard } from "@/components/post-card";
import { SearchBox } from "@/components/search-box";
import { EmptyState } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
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
  const [viewer, t] = await Promise.all([getCurrentUser(), getT()]);

  const results = parsed.success
    ? await Promise.all([
        searchCreators(parsed.data.q),
        searchPosts(parsed.data.q, viewer?.id),
      ])
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">{t("search.title")}</h1>
        <SearchBox initialQuery={raw} autoFocus />
      </div>

      {!parsed.success ? (
        raw.trim().length > 0 ? (
          <p className="text-sm text-muted">{t("search.minChars")}</p>
        ) : (
          <p className="text-sm text-muted">{t("search.prompt")}</p>
        )
      ) : (
        <SearchResults
          creators={results![0]}
          posts={results![1]}
          query={parsed.data.q}
          currentUserId={viewer?.id}
          labels={{
            creators: t("search.creators"),
            posts: t("search.posts"),
            noResults: t("search.noResults", { query: parsed.data.q }),
            noResultsBody: t("search.noResultsBody"),
          }}
        />
      )}
    </div>
  );
}

function SearchResults({
  creators,
  posts,
  currentUserId,
  labels,
}: {
  creators: Awaited<ReturnType<typeof searchCreators>>;
  posts: Awaited<ReturnType<typeof searchPosts>>;
  query: string;
  currentUserId?: string;
  labels: {
    creators: string;
    posts: string;
    noResults: string;
    noResultsBody: string;
  };
}) {
  if (creators.length === 0 && posts.length === 0) {
    return (
      <EmptyState title={labels.noResults} description={labels.noResultsBody} />
    );
  }

  return (
    <div className="space-y-8">
      {creators.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {labels.creators}
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
            {labels.posts}
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
