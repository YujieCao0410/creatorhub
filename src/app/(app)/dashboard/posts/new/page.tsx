import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/page-guards";
import { getT } from "@/lib/i18n/server";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireUserPage();
  const t = await getT();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("editor.newPost")}</h1>
      <PostEditor mode="create" />
    </div>
  );
}
