export type Theme = 'dark' | 'light';

export const THEME_KEY = 'mdev-theme';

export const PALETTE = {
    dark: {bg: '#0d0d0d', accent: '#e85d4a'},
    light: {bg: '#f4f4f2', accent: '#b3261e'},
} as const satisfies Record<Theme, { bg: string; accent: string }>;

export const TOGGLE_LABEL = {
    dark: 'Switch to light theme',
    light: 'Switch to dark theme',
} as const satisfies Record<Theme, string>;
