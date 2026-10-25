import type {APIRoute} from 'astro';
import {faviconSvg} from '../lib/icons';

export const GET: APIRoute = () =>
    new Response(faviconSvg({rounded: true}), {headers: {'Content-Type': 'image/svg+xml; charset=utf-8'}});
