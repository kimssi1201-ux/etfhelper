import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CommunityPortal from "../../CommunityPortal";
import { communities } from "@/lib/community-data";

export function generateStaticParams() { return communities.map((community) => ({ slug: community.slug })); }
export const dynamicParams = false;
export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { return params.then(({ slug }) => { const community = communities.find((item) => item.slug === slug); return { title: community ? `${community.name} 인기글 | 모아봄` : "커뮤니티 | 모아봄", description: community ? `${community.name}의 공개 게시글 메타데이터와 짧은 요약을 모아봅니다.` : "커뮤니티 인기글 모음" }; }); }
export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; if (!communities.some((community) => community.slug === slug)) notFound(); return <CommunityPortal initialCommunity={slug} />; }
