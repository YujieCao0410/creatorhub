import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="prose mx-auto max-w-2xl py-6 text-sm leading-6">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-muted">Last updated: September 2, 2026</p>

      <h2 className="mt-6 font-semibold">1. What we collect</h2>
      <ul className="list-disc pl-5">
        <li>
          <strong>Account data</strong> — your name, email, handle and password
          hash, so you can sign in.
        </li>
        <li>
          <strong>Content</strong> — the videos, images, titles, captions and
          hashtags you upload in order to publish them.
        </li>
        <li>
          <strong>Connected-platform tokens</strong> — the access and refresh
          tokens each platform gives us when you connect an account. They are
          stored so we can post on your behalf, and are deleted when you
          disconnect.
        </li>
        <li>
          <strong>Basic profile info</strong> from a connected platform (such as
          your channel or account name) so we can show which account is linked.
        </li>
      </ul>

      <h2 className="mt-6 font-semibold">2. How we use it</h2>
      <p>
        We use your data only to run CreatorHub: to authenticate you, to store
        your drafts, and to publish content to the platforms you have connected
        when you ask. We do not sell your data or use it for advertising.
      </p>

      <h2 className="mt-6 font-semibold">3. Sharing</h2>
      <p>
        We share content with a platform only when you choose to publish to it.
        We use Stripe to process payments and Anthropic&apos;s API to generate
        captions when you use that feature. We do not share your data with anyone
        else except where required by law.
      </p>

      <h2 className="mt-6 font-semibold">4. Retention</h2>
      <p>
        We keep your account and content until you delete them or close your
        account. Platform tokens are removed as soon as you disconnect the
        account.
      </p>

      <h2 className="mt-6 font-semibold">5. Your choices</h2>
      <p>
        You can edit or delete your posts, disconnect any platform, and request
        deletion of your account at any time by emailing us.
      </p>

      <h2 className="mt-6 font-semibold">6. Contact</h2>
      <p>
        Privacy questions or deletion requests:{" "}
        <a href="mailto:yujiecao0410@gmail.com">yujiecao0410@gmail.com</a>.
      </p>
    </article>
  );
}
