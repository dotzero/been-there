import { COUNTRY_BY_CODE, COUNTRY_CODES } from './countries.js';
import {
  DEFAULT_LANGUAGE,
  DEFAULT_MAP_PROJECTION,
  DEFAULT_MAP_STYLE,
  SUPPORTED_LANGUAGES,
  SUPPORTED_MAP_PROJECTIONS,
  SUPPORTED_MAP_STYLES,
} from './config.js';

const LEGACY_COUNTRIES_QUERY_KEY = 'c';
const VISITED_QUERY_KEY = 'v';
const LANGUAGE_QUERY_KEY = 'l';
const STYLE_QUERY_KEY = 's';
const PROJECTION_QUERY_KEY = 'p';
const COUNTRY_CODE_INDEX = new Map(COUNTRY_CODES.map((code, index) => [code, index]));
const VISITED_MASK_BYTES = Math.ceil(COUNTRY_CODES.length / 8);

function toBase64Url(bytes) {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function fromBase64Url(value) {
  try {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);

    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function encodeVisited(visited) {
  if (visited.size === 0) {
    return '';
  }

  const bytes = new Uint8Array(VISITED_MASK_BYTES);

  visited.forEach((code) => {
    const index = COUNTRY_CODE_INDEX.get(code);

    if (index === undefined) {
      return;
    }

    bytes[Math.floor(index / 8)] |= 1 << (index % 8);
  });

  return toBase64Url(bytes);
}

function decodeVisited(value) {
  if (!value) {
    return null;
  }

  const bytes = fromBase64Url(value);

  if (!bytes || bytes.length > VISITED_MASK_BYTES) {
    return null;
  }

  const visited = new Set();

  COUNTRY_CODES.forEach((code, index) => {
    const byte = bytes[Math.floor(index / 8)] ?? 0;

    if ((byte & (1 << (index % 8))) !== 0) {
      visited.add(code);
    }
  });

  return visited;
}

function decodeLegacyCountries(value) {
  const codes = (value ?? '')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => COUNTRY_BY_CODE.has(code));

  return new Set(codes);
}

export function parseStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const rawVisited = params.get(VISITED_QUERY_KEY);
  const rawCountries = params.get(LEGACY_COUNTRIES_QUERY_KEY);
  const rawLanguage = params.get(LANGUAGE_QUERY_KEY)?.toLowerCase();
  const rawMapStyle = params.get(STYLE_QUERY_KEY);
  const rawMapProjection = params.get(PROJECTION_QUERY_KEY);
  const language = SUPPORTED_LANGUAGES.has(rawLanguage) ? rawLanguage : DEFAULT_LANGUAGE;
  const languageExplicit = params.has(LANGUAGE_QUERY_KEY);
  const mapStyle = SUPPORTED_MAP_STYLES.has(rawMapStyle) ? rawMapStyle : DEFAULT_MAP_STYLE;
  const mapStyleExplicit = params.has(STYLE_QUERY_KEY);
  const mapProjection = SUPPORTED_MAP_PROJECTIONS.has(rawMapProjection)
    ? rawMapProjection
    : DEFAULT_MAP_PROJECTION;
  const mapProjectionExplicit = params.has(PROJECTION_QUERY_KEY);
  const compactVisited = decodeVisited(rawVisited);

  return {
    language,
    languageExplicit,
    mapProjection,
    mapProjectionExplicit,
    mapStyle,
    mapStyleExplicit,
    visited: compactVisited ?? decodeLegacyCountries(rawCountries),
  };
}

export function writeStateToUrl(
  visited,
  language,
  languageExplicit,
  mapStyle,
  mapStyleExplicit,
  mapProjection,
  mapProjectionExplicit,
) {
  const url = new URL(window.location.href);
  const encodedVisited = encodeVisited(visited);
  const queryParts = [];

  if (encodedVisited) {
    queryParts.push(`${VISITED_QUERY_KEY}=${encodedVisited}`);
  }

  if (languageExplicit || language !== DEFAULT_LANGUAGE) {
    queryParts.push(`${LANGUAGE_QUERY_KEY}=${language}`);
  }

  if (mapStyleExplicit || mapStyle !== DEFAULT_MAP_STYLE) {
    queryParts.push(`${STYLE_QUERY_KEY}=${mapStyle}`);
  }

  if (mapProjectionExplicit || mapProjection !== DEFAULT_MAP_PROJECTION) {
    queryParts.push(`${PROJECTION_QUERY_KEY}=${mapProjection}`);
  }

  url.search = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}
