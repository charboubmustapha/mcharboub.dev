import type {APIRoute, GetStaticPaths, InferGetStaticPropsType} from 'astro';
import {getPosts, toMeta} from '../../lib/posts';

export const getStaticPaths = (async () => {
    const posts = await getPosts();
    return posts.map((post) => ({params: {slug: post.id}, props: {post}}));
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({props}) => {
    const {post} = props;
    const body = {...toMeta(post), html: post.rendered?.html ?? ''};
    return new Response(JSON.stringify(body), {
        headers: {'Content-Type': 'application/json; charset=utf-8'},
    });
};
