import sharp from 'sharp';
import {PALETTE} from './theme';

export type IconSpec = {
    size: number;
    rounded?: boolean;
    safeZone?: boolean;
    manifest?: boolean;
};

export const RASTER_ICONS: Record<string, IconSpec> = {
    'icon-192': {size: 192, rounded: true, manifest: true},
    'icon-512': {size: 512, rounded: true, manifest: true},
    'icon-512-maskable': {size: 512, safeZone: true, manifest: true},
    'apple-touch-icon': {size: 180},
};

const CUP = `
  <path class="ink" d="M11 23H41V41C41 48 36 53 29 53H23C16 53 11 48 11 41Z"/>
  <path class="ink-s" d="M41 29C50 29 54 33 54 38C54 43 50 47 41 47" fill="none" stroke-width="6" stroke-linecap="round"/>
  <path class="steam" d="M14 13C18 7 24 7 26 11C28 15 34 15 38 9" fill="none" stroke-width="5" stroke-linecap="round"/>
  <path class="ink-s" d="M9 59H45" stroke-width="4.5" stroke-linecap="round"/>`;

const paint = (bg: string, ink: string, steam: string) =>
    `.bg { fill: ${bg}; } .ink { fill: ${ink}; } .ink-s { stroke: ${ink}; } .steam { stroke: ${steam}; }`;

export function faviconSvg({rounded = false, safeZone = false}: Omit<IconSpec, 'size'> = {}): string {
    const {dark, light} = PALETTE;
    const art = safeZone ? `<g transform="translate(9.6 9.6) scale(.7)">${CUP}</g>` : CUP;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    ${paint(dark.bg, light.bg, dark.accent)}
    @media (prefers-color-scheme: light) { ${paint(light.bg, dark.bg, light.accent)} }
  </style>
  <rect class="bg" width="64" height="64"${rounded ? ' rx="14"' : ''}/>${art}
</svg>
`;
}

export async function renderPng(svg: string, size: number): Promise<Uint8Array<ArrayBuffer>> {
    const png = await sharp(Buffer.from(svg), {density: 72 * (size / 64)}).resize(size, size).png({compressionLevel: 9}).toBuffer();
    return new Uint8Array(png);
}

export function icoFromPng(png: Uint8Array, size: number): Uint8Array<ArrayBuffer> {
    const header = Buffer.alloc(22);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);
    header.writeUInt8(size, 6);
    header.writeUInt8(size, 7);
    header.writeUInt8(0, 8);
    header.writeUInt8(0, 9);
    header.writeUInt16LE(1, 10);
    header.writeUInt16LE(32, 12);
    header.writeUInt32LE(png.length, 14);
    header.writeUInt32LE(header.length, 18);
    return new Uint8Array(Buffer.concat([header, png]));
}
