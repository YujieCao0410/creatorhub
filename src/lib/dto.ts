/**
 * Data-transfer types: the exact shapes the API returns and the UI consumes.
 *
 * These live here (not next to the services) so Client Components can import
 * them without pulling a server module — and its Prisma import — into the
 * browser bundle. Services import these and map their rows onto them.
 */

export type PublicUser = {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type Membership = "FREE" | "PRO";

export type SelfUser = PublicUser & {
  email: string;
  membership: Membership;
};

export type MembershipInfo = {
  membership: Membership;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  usage: {
    drafts: number;
    draftLimit: number | null;
  };
};

export type CreatorProfile = PublicUser & {
  counts: { posts: number; followers: number; following: number };
  isFollowing: boolean;
};

export type PostAuthor = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
};

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  counts: { likes: number; comments: number };
  viewerHasLiked: boolean;
};

export type PostDetail = PostSummary & { content: string };

export type Paginated<T> = {
  data: T[];
  nextCursor: string | null;
};

export type PostList = Paginated<PostSummary>;
export type UserPage = Paginated<PublicUser>;

export type LikeState = {
  likes: number;
  viewerHasLiked: boolean;
};

export type FollowState = {
  following: boolean;
  followerCount: number;
};
