export type Community = {
  id: string;
  slug: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
};

export type PostStatus = "published" | "hidden" | "removed";

export type CommunityPost = {
  id: string;
  communitySlug: string;
  communityName: string;
  externalId: string;
  title: string;
  originalUrl: string;
  thumbnailUrl: string | null;
  summary: string;
  authorName: string | null;
  views: number | null;
  likes: number | null;
  commentsCount: number | null;
  publishedAt: string;
  collectedAt: string;
  status: PostStatus;
  contentPreview?: string;
  sample?: boolean;
};

export type PostSort = "popular" | "latest";

export type PostQuery = {
  community?: string;
  q?: string;
  sort?: PostSort;
  page?: number;
  pageSize?: number;
};
