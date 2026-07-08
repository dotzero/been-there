export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_MAP_STYLE = 'standard';
export const DEFAULT_MAP_PROJECTION = 'flat';
export const SUPPORTED_LANGUAGES = new Set(['en', 'ru']);

const runtimeConfig = globalThis.__RUNTIME_CONFIG__ ?? {};
const runtimeMapboxToken = runtimeConfig.MAPBOX_TOKEN;

export const MAPBOX_TOKEN =
  runtimeMapboxToken && runtimeMapboxToken !== '__MAPBOX_TOKEN__'
    ? runtimeMapboxToken
    : import.meta.env.MAPBOX_TOKEN;

export const MAPBOX_STYLES = {
  standard: 'mapbox://styles/mapbox/standard',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

export const SUPPORTED_MAP_STYLES = new Set(Object.keys(MAPBOX_STYLES));
export const SUPPORTED_MAP_PROJECTIONS = new Set(['flat', 'globe']);
