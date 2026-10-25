import type {APIRoute, InferGetStaticPropsType} from 'astro';
import {postPaths, toMeta} from '../../lib/posts';

export const getStaticPaths = postPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({props}) => {
    const {post} = props;
    const body = {...toMeta(post), html: post.rendered?.html ?? ''};
    return new Response(JSON.stringify(body), {
        headers: {'Content-Type': 'application/json; charset=utf-8'},
    });
};
