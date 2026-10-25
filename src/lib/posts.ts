import {type CollectionEntry, getCollection} from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export interface PostMeta {
    slug: string;
    title: string;
    description: string;
    date: string;
    readingTime: string;
    url: string;
}

export async function getPosts(): Promise<Post[]> {
    const posts = await getCollection('blog', (p) => import.meta.env.DEV || !p.data.draft);
    return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

function readingTime(body: string | undefined): string {
    const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.round(words / 200))} min`;
}

function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export function toMeta(post: Post): PostMeta {
    return {
        slug: post.id,
        title: post.data.title,
        description: post.data.description ?? '',
        date: isoDate(post.data.date),
        readingTime: readingTime(post.body),
        url: `/posts/${post.id}/`,
    };
}
