import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New post</h1>
      <PostEditor mode="create" />
    </div>
  );
}
