import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/page-guards";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireUserPage();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New post</h1>
      <PostEditor mode="create" />
    </div>
  );
}
