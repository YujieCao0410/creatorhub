import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/page-guards";
import { getT } from "@/lib/i18n/server";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const [user, t] = await Promise.all([requireUserPage(), getT()]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("editor.newPost")}</h1>
      <PostEditor mode="create" defaultTags={user.defaultTags} />
    </div>
  );
}
