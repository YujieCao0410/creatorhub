import { requireUserPage } from "@/lib/auth/page-guards";
import { getT } from "@/lib/i18n/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const [user, t] = await Promise.all([requireUserPage(), getT()]);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("dashboard.profileTitle")}</h1>
        <p className="text-sm text-muted">{t("dashboard.profileSubtitle")}</p>
      </div>
      <ProfileForm
        initial={{
          name: user.name,
          bio: user.bio ?? "",
          avatarUrl: user.avatarUrl ?? "",
        }}
      />
    </div>
  );
}
