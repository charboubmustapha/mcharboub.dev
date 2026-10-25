import type {APIRoute} from 'astro';
import {RASTER_ICONS} from '../lib/icons';
import {PALETTE} from '../lib/theme';

const icons = Object.entries(RASTER_ICONS)
    .filter(([, spec]) => spec.manifest)
    .map(([icon, spec]) => ({
        src: `/${icon}.png`,
        sizes: `${spec.size}x${spec.size}`,
        type: 'image/png',
        ...(spec.safeZone && {purpose: 'maskable'}),
    }));

const manifest = {
    name: 'mcharboub.dev',
    short_name: 'mcharboub',
    description: 'Mustapha Charboub — lead software engineer. A bash prompt for a home page.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: PALETTE.dark.bg,
    theme_color: PALETTE.dark.bg,
    icons,
};

export const GET: APIRoute = () =>
    new Response(JSON.stringify(manifest, null, 2), {headers: {'Content-Type': 'application/manifest+json'}});
