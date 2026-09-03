import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <article className="prose mx-auto max-w-2xl py-6 text-sm leading-6">
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-muted">Last updated: September 2, 2026</p>

      <h2 className="mt-6 font-semibold">1. What CreatorHub is</h2>
      <p>
        CreatorHub is a tool that helps an individual creator publish one video
        to several social platforms (such as YouTube, TikTok and Instagram) from a
        single place. You connect your own accounts on those platforms, and
        CreatorHub posts on your behalf when you ask it to.
      </p>

      <h2 className="mt-6 font-semibold">2. Your account</h2>
      <p>
        You are responsible for the content you upload and distribute through
        CreatorHub, and for keeping your login details secure. You must own the
        rights to the videos, images and text you publish, and you must follow
        the rules of each platform you connect.
      </p>

      <h2 className="mt-6 font-semibold">3. Connected platforms</h2>
      <p>
        When you connect a platform, you grant CreatorHub permission to upload
        and post content to that account until you disconnect it. You can revoke
        access at any time from the platform&apos;s own settings or from
        CreatorHub&apos;s settings page.
      </p>

      <h2 className="mt-6 font-semibold">4. Payment</h2>
      <p>
        Paid plans are billed monthly through Stripe. New subscribers get a free
        trial; unless you cancel before it ends, the plan renews automatically at
        the listed price. You can cancel at any time and keep access until the
        end of the paid period.
      </p>

      <h2 className="mt-6 font-semibold">5. Acceptable use</h2>
      <p>
        Do not use CreatorHub to publish content that is illegal, infringing,
        deceptive, or that violates a connected platform&apos;s terms. We may
        suspend an account that does.
      </p>

      <h2 className="mt-6 font-semibold">6. No warranty</h2>
      <p>
        CreatorHub is provided &quot;as is&quot;. Platform APIs change and can
        fail, and we cannot guarantee that every post will succeed. We are not
        liable for indirect or consequential losses.
      </p>

      <h2 className="mt-6 font-semibold">7. Changes</h2>
      <p>
        We may update these terms. Continued use after an update means you accept
        the new terms.
      </p>

      <h2 className="mt-6 font-semibold">8. Contact</h2>
      <p>
        Questions about these terms: <a href="mailto:yujiecao0410@gmail.com">yujiecao0410@gmail.com</a>.
      </p>
    </article>
  );
}
