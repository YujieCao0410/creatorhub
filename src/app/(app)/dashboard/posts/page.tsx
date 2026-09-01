import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { listAuthoredPosts } from "@/server/services/post-service";
import { PostRowActions } from "./post-row-actions";

export default async function ContentPage() {
  const user = await requireUser();
  const posts = await listAuthoredPosts(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Content</h1>
        <Link href="/dashboard/posts/new" className={buttonClasses({ size: "sm" })}>
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Write your first post and publish it to your profile."
          action={
            <Link
              href="/dashboard/posts/new"
              className={buttonClasses({ size: "sm" })}
            >
              New post
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-border p-0">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{post.title}</span>
                  {post.published ? (
                    <Badge tone="green">Published</Badge>
                  ) : (
                    <Badge>Draft</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {post.counts.likes} likes · updated{" "}
                  {new Date(post.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <PostRowActions slug={post.slug} published={post.published} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
