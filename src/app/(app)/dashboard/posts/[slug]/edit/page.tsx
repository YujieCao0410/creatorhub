import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUserPage } from "@/lib/auth/page-guards";
import { AppError } from "@/lib/errors";
import { getPostBySlug } from "@/server/services/post-service";
import { PostEditor } from "../../post-editor";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUserPage();
  const { slug } = await params;

  let post;
  try {
    post = await getPostBySlug(slug, user.id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  if (post.author.id !== user.id) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit post</h1>
      <PostEditor mode="edit" post={post} />
    </div>
  );
}
