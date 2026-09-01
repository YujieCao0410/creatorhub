import { requireUser } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted">
          This information appears on your public creator page.
        </p>
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
