import type {APIRoute} from 'astro';
import {faviconSvg, icoFromPng, renderPng} from '../lib/icons';

const SIZE = 32;

export const GET: APIRoute = async () => {
    const png = await renderPng(faviconSvg({rounded: true}), SIZE);
    return new Response(icoFromPng(png, SIZE), {headers: {'Content-Type': 'image/x-icon'}});
};
