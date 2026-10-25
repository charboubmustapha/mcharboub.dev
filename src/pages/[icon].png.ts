import type {APIRoute, GetStaticPaths} from 'astro';
import {faviconSvg, type IconSpec, RASTER_ICONS, renderPng} from '../lib/icons';

export const getStaticPaths = (() =>
    Object.entries(RASTER_ICONS).map(([icon, spec]) => ({params: {icon}, props: spec}))) satisfies GetStaticPaths;

export const GET: APIRoute<IconSpec> = async ({props}) =>
    new Response(await renderPng(faviconSvg(props), props.size), {headers: {'Content-Type': 'image/png'}});
