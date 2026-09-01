/**
 * URL slugs for posts. A slug is generated once from the title and then stays
 * fixed for the life of the post (even if the title is edited later) so links
 * never break. A short random suffix keeps slugs unique without a database
 * round-trip.
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accent marks
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export function uniqueSlug(title: string): string {
  const base = slugify(title) || "post";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
