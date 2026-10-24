import type {APIRoute} from 'astro';
import {getPosts, toMeta} from '../../lib/posts';

export const GET: APIRoute = async () => {
    const posts = await getPosts();
    return new Response(JSON.stringify(posts.map(toMeta)), {
        headers: {'Content-Type': 'application/json; charset=utf-8'},
    });
};
