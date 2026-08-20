import type { Community, CommunityPost } from "@/lib/community-types";

export type RawCollectedPost = {
  externalId: string;
  title: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  summary?: string;
  authorName?: string | null;
  views?: number | null;
  likes?: number | null;
  commentsCount?: number | null;
  publishedAt: string;
};

export type CommunityCollector = {
  collectPosts: (community: Community) => Promise<RawCollectedPost[]>;
  collectPostDetail: (community: Community, externalId: string) => Promise<RawCollectedPost | null>;
  normalizePost: (community: Community, post: RawCollectedPost) => CommunityPost;
};
