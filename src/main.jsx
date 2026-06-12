import React from 'react';
import { createRoot } from 'react-dom/client';
import { geoEqualEarth, geoPath } from 'd3-geo';
import isoCountries from 'i18n-iso-countries';
import enCountries from 'i18n-iso-countries/langs/en.json';
import ruCountries from 'i18n-iso-countries/langs/ru.json';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Download from 'lucide-react/dist/esm/icons/download';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Earth from 'lucide-react/dist/esm/icons/earth';
import Languages from 'lucide-react/dist/esm/icons/languages';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import MapIcon from 'lucide-react/dist/esm/icons/map';
import Moon from 'lucide-react/dist/esm/icons/moon';
import Sun from 'lucide-react/dist/esm/icons/sun';
import { feature } from 'topojson-client';
import { COUNTRIES, COUNTRY_BY_CODE, COUNTRY_BY_NUMERIC, TINY_COUNTRY_CODES } from './countries.js';
import './styles.css';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';
const LEGACY_COUNTRIES_QUERY_KEY = 'c';
const VISITED_QUERY_KEY = 'v';
const LANGUAGE_QUERY_KEY = 'l';
const STYLE_QUERY_KEY = 's';
const PROJECTION_QUERY_KEY = 'p';
const DEFAULT_LANGUAGE = 'en';
const DEFAULT_MAP_STYLE = 'standard';
const DEFAULT_MAP_PROJECTION = 'flat';
const SUPPORTED_LANGUAGES = new Set(['en', 'ru']);
const runtimeConfig = globalThis.__RUNTIME_CONFIG__ ?? {};
const runtimeMapboxToken = runtimeConfig.MAPBOX_TOKEN;
const MAPBOX_TOKEN =
  runtimeMapboxToken && runtimeMapboxToken !== '__MAPBOX_TOKEN__'
    ? runtimeMapboxToken
    : import.meta.env.MAPBOX_TOKEN;
const MAPBOX_STYLES = {
  standard: 'mapbox://styles/mapbox/standard',
  dark: 'mapbox://styles/mapbox/dark-v11',
};
const SUPPORTED_MAP_STYLES = new Set(Object.keys(MAPBOX_STYLES));
const SUPPORTED_MAP_PROJECTIONS = new Set(['flat', 'globe']);
const COUNTRIES_SOURCE_ID = 'visited-country-boundaries';
const MAPBOX_COUNTRIES_SOURCE_URL = 'mapbox://mapbox.country-boundaries-v1';
const MAPBOX_COUNTRIES_SOURCE_LAYER = 'country_boundaries';
const VISITED_FILL_LAYER_ID = 'visited-country-fill';
const VISITED_LINE_LAYER_ID = 'visited-country-line';
const TINY_SOURCE_ID = 'visited-tiny-countries';
const TINY_LAYER_ID = 'visited-tiny-country-markers';
const VISITED_PATTERN_ID = 'visited-stripes';

isoCountries.registerLocale(enCountries);
isoCountries.registerLocale(ruCountries);

const COUNTRY_CODES = COUNTRIES.map((country) => country.code).sort();
const COUNTRY_CODE_INDEX = new Map(COUNTRY_CODES.map((code, index) => [code, index]));
const VISITED_MASK_BYTES = Math.ceil(COUNTRY_CODES.length / 8);

const MESSAGES = {
  en: {
    countriesButton: 'Countries',
    copyLink: 'Copy link',
    copied: 'Link copied',
    copyFailed: 'Copy failed',
    exportPng: 'Export PNG',
    preparing: 'Preparing...',
    exported: 'Exported',
    exportFailed: 'Export failed',
    mapError: 'Map data failed to load',
    mapboxTokenMissing: 'Add MAPBOX_TOKEN to .env to use Mapbox',
    webglFallback: 'WebGL is unavailable, showing the fallback map',
    mapStageLabel: 'Been There world map',
    mapLabel: 'World map',
    modalTitle: 'Been There',
    modalSummary: (selected, total) => `${selected} of ${total} UN member states selected`,
    close: 'Close',
    searchPlaceholder: 'Search country or ISO code',
    clear: 'Clear',
    selectAll: 'Select all',
    languageLabel: 'Switch language',
    styleToggleLabel: 'Switch day/night mode',
    globeToggleLabel: 'Switch to globe view',
    flatToggleLabel: 'Switch to flat map',
    globeUnavailable: 'Globe view requires Mapbox',
    collapseToolbar: 'Hide toolbar',
    expandToolbar: 'Show toolbar',
  },
  ru: {
    countriesButton: 'Страны',
    copyLink: 'Скопировать ссылку',
    copied: 'Ссылка скопирована',
    copyFailed: 'Не удалось скопировать',
    exportPng: 'Экспорт PNG',
    preparing: 'Готовлю...',
    exported: 'Экспортировано',
    exportFailed: 'Не удалось экспортировать',
    mapError: 'Не удалось загрузить карту',
    mapboxTokenMissing: 'Добавьте MAPBOX_TOKEN в .env, чтобы использовать Mapbox',
    webglFallback: 'WebGL недоступен, показываю резервную карту',
    mapStageLabel: 'Карта мира с посещенными странами',
    mapLabel: 'Карта мира',
    modalTitle: 'Посещенные страны',
    modalSummary: (selected, total) => `Выбрано ${selected} из ${total} стран ООН`,
    close: 'Закрыть',
    searchPlaceholder: 'Поиск страны или ISO-кода',
    clear: 'Очистить',
    selectAll: 'Выделить все',
    languageLabel: 'Сменить язык',
    styleToggleLabel: 'Сменить режим день/ночь',
    globeToggleLabel: 'Переключить на глобус',
    flatToggleLabel: 'Переключить на плоскую карту',
    globeUnavailable: 'Для глобуса нужен Mapbox',
    collapseToolbar: 'Скрыть панель',
    expandToolbar: 'Показать панель',
  },
};

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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function drawLogoOnCanvas(context, scale = 1) {
  const logo = await loadImage('/logo.png');
  const width = Math.min(95, Math.max(56, window.innerWidth * 0.065));
  const height = width * (logo.naturalHeight / logo.naturalWidth);

  context.drawImage(logo, 16 * scale, 16 * scale, width * scale, height * scale);
}

function parseStateFromUrl() {
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

function getCountryName(country, language) {
  return isoCountries.getName(country.code, language) ?? country.name;
}

function getVisitedFilter(visited, propertyName = 'iso3') {
  const codes = [...visited];

  if (codes.length === 0) {
    return ['==', ['get', propertyName], '__none__'];
  }

  return ['in', ['get', propertyName], ['literal', codes]];
}

function getTinyCountriesGeoJson(visited) {
  return {
    type: 'FeatureCollection',
    features: TINY_COUNTRY_CODES
      .map((code) => COUNTRY_BY_CODE.get(code))
      .filter((country) => country && visited.has(country.code) && country.coordinates)
      .map((country) => ({
        type: 'Feature',
        properties: {
          iso3: country.code,
          name: country.name,
        },
        geometry: {
          type: 'Point',
          coordinates: country.coordinates,
        },
      })),
  };
}

function getMapboxProjectionName(mapProjection) {
  return mapProjection === 'globe' ? 'globe' : 'mercator';
}

function getMapboxFog(mapProjection) {
  if (mapProjection !== 'globe') {
    return null;
  }

  return {
    range: [0.8, 8],
    color: '#d7ecff',
    'high-color': '#7fb1ff',
    'horizon-blend': 0.18,
    'space-color': '#05070d',
    'star-intensity': 0.3,
  };
}

function applyMapProjection(map, mapProjection) {
  map.setProjection(getMapboxProjectionName(mapProjection));
  map.setFog(getMapboxFog(mapProjection));
}

function createVisitedPattern() {
  const size = 16;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = size;
  canvas.height = size;
  context.clearRect(0, 0, size, size);
  context.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  context.lineWidth = 4;
  context.lineCap = 'square';

  for (let offset = -size; offset <= size * 2; offset += 8) {
    context.beginPath();
    context.moveTo(offset, size);
    context.lineTo(offset + size, 0);
    context.stroke();
  }

  return context.getImageData(0, 0, size, size);
}

function ensureVisitedPattern(map) {
  if (map.hasImage(VISITED_PATTERN_ID)) {
    return;
  }

  map.addImage(VISITED_PATTERN_ID, createVisitedPattern(), { pixelRatio: 2 });
}

function addVisitedLayers(map, countriesGeoJson, visited) {
  ensureVisitedPattern(map);

  if (!map.getSource(COUNTRIES_SOURCE_ID)) {
    map.addSource(COUNTRIES_SOURCE_ID, {
      type: 'vector',
      url: MAPBOX_COUNTRIES_SOURCE_URL,
    });
  }

  const visitedBoundaryFilter = [
    'all',
    ['==', ['get', 'disputed'], 'false'],
    ['any', ['==', 'all', ['get', 'worldview']], ['in', 'US', ['get', 'worldview']]],
    getVisitedFilter(visited, 'iso_3166_1_alpha_3'),
  ];

  if (!map.getLayer(VISITED_FILL_LAYER_ID)) {
    map.addLayer({
      id: VISITED_FILL_LAYER_ID,
      type: 'fill',
      source: COUNTRIES_SOURCE_ID,
      'source-layer': MAPBOX_COUNTRIES_SOURCE_LAYER,
      filter: visitedBoundaryFilter,
      paint: {
        'fill-pattern': VISITED_PATTERN_ID,
        'fill-opacity': 1,
      },
    });
  }

  if (!map.getLayer(VISITED_LINE_LAYER_ID)) {
    map.addLayer({
      id: VISITED_LINE_LAYER_ID,
      type: 'line',
      source: COUNTRIES_SOURCE_ID,
      'source-layer': MAPBOX_COUNTRIES_SOURCE_LAYER,
      filter: visitedBoundaryFilter,
      paint: {
        'line-color': '#38bdf8',
        'line-width': 0.8,
        'line-opacity': 0.5,
      },
    });
  }

  if (!map.getSource(TINY_SOURCE_ID)) {
    map.addSource(TINY_SOURCE_ID, {
      type: 'geojson',
      data: getTinyCountriesGeoJson(visited),
    });
  }

  if (!map.getLayer(TINY_LAYER_ID)) {
    map.addLayer({
      id: TINY_LAYER_ID,
      type: 'circle',
      source: TINY_SOURCE_ID,
      paint: {
        'circle-color': '#38bdf8',
        'circle-opacity': 0.5,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 4, 5, 7],
        'circle-stroke-color': '#38bdf8',
        'circle-stroke-opacity': 0.5,
        'circle-stroke-width': 1.2,
      },
    });
  }
}

function updateVisitedLayers(map, visited) {
  if (!map.loaded()) {
    return;
  }

  const filter = [
    'all',
    ['==', ['get', 'disputed'], 'false'],
    ['any', ['==', 'all', ['get', 'worldview']], ['in', 'US', ['get', 'worldview']]],
    getVisitedFilter(visited, 'iso_3166_1_alpha_3'),
  ];

  if (map.getLayer(VISITED_FILL_LAYER_ID)) {
    map.setFilter(VISITED_FILL_LAYER_ID, filter);
  }

  if (map.getLayer(VISITED_LINE_LAYER_ID)) {
    map.setFilter(VISITED_LINE_LAYER_ID, filter);
  }

  const tinySource = map.getSource(TINY_SOURCE_ID);
  if (tinySource) {
    tinySource.setData(getTinyCountriesGeoJson(visited));
  }
}

function writeStateToUrl(
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

function canUseMapbox() {
  if (!MAPBOX_TOKEN || !mapboxgl.supported()) {
    return false;
  }

  return true;
}

function App() {
  const [initialUrlState] = React.useState(parseStateFromUrl);
  const [initialCanUseMapbox] = React.useState(canUseMapbox);
  const [visited, setVisited] = React.useState(initialUrlState.visited);
  const [language, setLanguage] = React.useState(initialUrlState.language);
  const [languageExplicit, setLanguageExplicit] = React.useState(initialUrlState.languageExplicit);
  const [mapStyle, setMapStyle] = React.useState(initialUrlState.mapStyle);
  const [mapStyleExplicit, setMapStyleExplicit] = React.useState(initialUrlState.mapStyleExplicit);
  const [mapProjection, setMapProjection] = React.useState(initialUrlState.mapProjection);
  const [mapProjectionExplicit, setMapProjectionExplicit] = React.useState(initialUrlState.mapProjectionExplicit);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [isToolbarCollapsed, setIsToolbarCollapsed] = React.useState(true);
  const [copyStatus, setCopyStatus] = React.useState('');
  const [exportStatus, setExportStatus] = React.useState('');
  const [countriesGeoJson, setCountriesGeoJson] = React.useState(null);
  const [mapError, setMapError] = React.useState(() => {
    if (!MAPBOX_TOKEN) {
      return 'mapboxTokenMissing';
    }

    return initialCanUseMapbox ? '' : 'webglFallback';
  });
  const [renderMode, setRenderMode] = React.useState(initialCanUseMapbox ? 'mapbox' : 'svg');
  const [mapSize, setMapSize] = React.useState({ width: 1200, height: 760 });
  const mapRef = React.useRef(null);
  const mapboxRef = React.useRef(null);
  const mapboxContainerRef = React.useRef(null);
  const activeMapStyleRef = React.useRef(null);
  const mapStyleRef = React.useRef(mapStyle);
  const mapProjectionRef = React.useRef(mapProjection);
  const svgRef = React.useRef(null);
  const visitedRef = React.useRef(visited);

  React.useEffect(() => {
    let isMounted = true;

    fetch(GEO_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Map request failed with ${response.status}`);
        }
        return response.json();
      })
      .then((topology) => {
        if (!isMounted) {
          return;
        }

        const features = feature(topology, topology.objects.countries).features
          .map((geoFeature) => {
            const country = COUNTRY_BY_NUMERIC.get(String(geoFeature.id).padStart(3, '0'));

            if (!country) {
              return null;
            }

            return {
              ...geoFeature,
              properties: {
                ...geoFeature.properties,
                iso3: country.code,
                name: country.name,
              },
            };
          })
          .filter(Boolean);

        setCountriesGeoJson({
          type: 'FeatureCollection',
          features,
        });
      })
      .catch(() => {
        if (isMounted) {
          setMapError('mapError');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!mapRef.current) {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setMapSize({
        width: Math.max(Math.round(width), 320),
        height: Math.max(Math.round(height), 320),
      });
    });

    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    writeStateToUrl(
      visited,
      language,
      languageExplicit,
      mapStyle,
      mapStyleExplicit,
      mapProjection,
      mapProjectionExplicit,
    );
  }, [language, languageExplicit, mapProjection, mapProjectionExplicit, mapStyle, mapStyleExplicit, visited]);

  React.useEffect(() => {
    if (!copyStatus && !exportStatus) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyStatus('');
      setExportStatus('');
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [copyStatus, exportStatus]);

  React.useEffect(() => {
    visitedRef.current = visited;
  }, [visited]);

  React.useEffect(() => {
    mapStyleRef.current = mapStyle;
  }, [mapStyle]);

  React.useEffect(() => {
    mapProjectionRef.current = mapProjection;
  }, [mapProjection]);

  React.useEffect(() => {
    if (!MAPBOX_TOKEN) {
      return undefined;
    }

    if (renderMode !== 'mapbox' || !mapboxContainerRef.current || !countriesGeoJson) {
      return undefined;
    }

    setMapError('');
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapboxContainerRef.current,
      style: MAPBOX_STYLES[mapStyleRef.current],
      center: [10, 18],
      zoom: 1.15,
      minZoom: 1,
      maxZoom: 5,
      maxBounds: [
        [-180, -60],
        [180, 82],
      ],
      projection: getMapboxProjectionName(mapProjectionRef.current),
      renderWorldCopies: false,
      preserveDrawingBuffer: true,
      attributionControl: false,
      logoPosition: 'bottom-right',
    });

    mapboxRef.current = map;
    activeMapStyleRef.current = mapStyleRef.current;
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    const onLoad = () => {
      applyMapProjection(map, mapProjectionRef.current);
      addVisitedLayers(map, countriesGeoJson, visitedRef.current);
    };
    const onError = () => {
      setRenderMode('svg');
      setMapError('mapError');
    };

    map.on('load', onLoad);
    map.on('error', onError);

    return () => {
      mapboxRef.current = null;
      activeMapStyleRef.current = null;
      map.remove();
    };
  }, [countriesGeoJson, renderMode]);

  React.useEffect(() => {
    const map = mapboxRef.current;

    if (!map || !countriesGeoJson || activeMapStyleRef.current === mapStyle) {
      return;
    }

    activeMapStyleRef.current = mapStyle;
    map.setStyle(MAPBOX_STYLES[mapStyle]);
    map.once('style.load', () => {
      applyMapProjection(map, mapProjectionRef.current);
      addVisitedLayers(map, countriesGeoJson, visitedRef.current);
      updateVisitedLayers(map, visitedRef.current);
    });
  }, [countriesGeoJson, mapStyle]);

  React.useEffect(() => {
    const map = mapboxRef.current;

    if (!map || !map.loaded()) {
      return;
    }

    applyMapProjection(map, mapProjection);
  }, [mapProjection]);

  React.useEffect(() => {
    const map = mapboxRef.current;

    if (!map) {
      return;
    }

    updateVisitedLayers(map, visited);
  }, [visited]);

  React.useEffect(() => {
    const onPopState = () => {
      const nextState = parseStateFromUrl();
      setVisited(nextState.visited);
      setLanguage(nextState.language);
      setLanguageExplicit(nextState.languageExplicit);
      setMapStyle(nextState.mapStyle);
      setMapStyleExplicit(nextState.mapStyleExplicit);
      setMapProjection(nextState.mapProjection);
      setMapProjectionExplicit(nextState.mapProjectionExplicit);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const messages = MESSAGES[language];
  const normalizedQuery = query.trim().toLowerCase();
  const localizedCountries = React.useMemo(() => {
    return COUNTRIES
      .map((country) => ({
        ...country,
        displayName: getCountryName(country, language),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, language));
  }, [language]);

  const filteredCountries = React.useMemo(() => {
    if (!normalizedQuery) {
      return localizedCountries;
    }

    return localizedCountries.filter((country) => {
      return (
        country.displayName.toLowerCase().includes(normalizedQuery) ||
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.code.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [localizedCountries, normalizedQuery]);

  const toggleCountry = (code) => {
    setVisited((current) => {
      const next = new Set(current);

      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }

      return next;
    });
  };

  const toggleAllCountries = () => {
    setVisited((current) => {
      if (current.size === COUNTRIES.length) {
        return new Set();
      }

      return new Set(COUNTRIES.map((country) => country.code));
    });
  };

  const copyShareLink = async () => {
    setCopyStatus('');
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus(messages.copied);
    } catch {
      setCopyStatus(messages.copyFailed);
    }
  };

  const toggleLanguage = () => {
    setLanguage((current) => (current === 'en' ? 'ru' : 'en'));
    setLanguageExplicit(true);
  };

  const toggleMapStyle = () => {
    setMapStyle((current) => (current === 'standard' ? 'dark' : 'standard'));
    setMapStyleExplicit(true);
  };

  const toggleMapProjection = () => {
    setMapProjection((current) => (current === 'globe' ? 'flat' : 'globe'));
    setMapProjectionExplicit(true);
  };

  const exportPng = async () => {
    if (!svgRef.current && !mapboxRef.current) {
      return;
    }

    setExportStatus(messages.preparing);

    try {
      let href;

      if (mapboxRef.current) {
        mapboxRef.current.triggerRepaint();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const mapCanvas = mapboxRef.current.getCanvas();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = mapCanvas.width;
        canvas.height = mapCanvas.height;
        context.drawImage(mapCanvas, 0, 0);
        await drawLogoOnCanvas(context, mapCanvas.width / mapCanvas.clientWidth);
        href = canvas.toDataURL('image/png');
      } else {
        const svg = svgRef.current;
        const clone = svg.cloneNode(true);
        const sourceNodes = [svg, ...svg.querySelectorAll('*')];
        const cloneNodes = [clone, ...clone.querySelectorAll('*')];

        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('width', String(mapSize.width));
        clone.setAttribute('height', String(mapSize.height));

        sourceNodes.forEach((sourceNode, index) => {
          const cloneNode = cloneNodes[index];
          const styles = window.getComputedStyle(sourceNode);

          cloneNode.setAttribute('fill', styles.fill);
          cloneNode.setAttribute('stroke', styles.stroke);
          cloneNode.setAttribute('stroke-width', styles.strokeWidth);
          cloneNode.setAttribute('vector-effect', styles.vectorEffect);
        });

        const serializedSvg = new XMLSerializer().serializeToString(clone);
        const blob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();

        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = objectUrl;
        });

        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = mapSize.width * scale;
        canvas.height = mapSize.height * scale;

        const context = canvas.getContext('2d');
        context.scale(scale, scale);
        context.fillStyle = '#f8fafc';
        context.fillRect(0, 0, mapSize.width, mapSize.height);
        context.drawImage(image, 0, 0, mapSize.width, mapSize.height);
        await drawLogoOnCanvas(context, scale);
        URL.revokeObjectURL(objectUrl);
        href = canvas.toDataURL('image/png');
      }

      const link = document.createElement('a');
      link.download = 'visited-countries.png';
      link.href = href;
      link.click();
      setExportStatus(messages.exported);
    } catch {
      setExportStatus(messages.exportFailed);
    }
  };

  const tinyVisited = TINY_COUNTRY_CODES
    .map((code) => COUNTRY_BY_CODE.get(code))
    .filter((country) => country && visited.has(country.code) && country.coordinates);

  const projection = React.useMemo(() => {
    return geoEqualEarth()
      .rotate([0, -8])
      .fitExtent(
        [
          [24, 24],
          [mapSize.width - 24, mapSize.height - 24],
        ],
        { type: 'Sphere' },
      );
  }, [mapSize.height, mapSize.width]);

  const path = React.useMemo(() => geoPath(projection), [projection]);
  const canToggleGlobe = renderMode === 'mapbox';
  const projectionToggleLabel = canToggleGlobe
    ? mapProjection === 'globe'
      ? messages.flatToggleLabel
      : messages.globeToggleLabel
    : messages.globeUnavailable;

  return (
    <main className="app-shell">
      <section ref={mapRef} className="map-stage" aria-label={messages.mapStageLabel}>
        {renderMode === 'mapbox' && (
          <div ref={mapboxContainerRef} className="mapbox-map" role="img" aria-label={messages.mapLabel} />
        )}

        {renderMode === 'svg' && (
          <svg
            ref={svgRef}
            className="world-map"
            viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
            role="img"
            aria-label={messages.mapLabel}
          >
            <rect width={mapSize.width} height={mapSize.height} className="ocean" />
            {countriesGeoJson?.features.map((geo) => {
              const country = COUNTRY_BY_CODE.get(geo.properties.iso3);
              const isVisited = country ? visited.has(country.code) : false;

              return (
                <path
                  key={geo.properties.iso3}
                  d={path(geo)}
                  className={isVisited ? 'country country--visited' : 'country'}
                >
                  <title>{country ? getCountryName(country, language) : messages.mapLabel}</title>
                </path>
              );
            })}

            {tinyVisited.map((country) => {
              const point = projection(country.coordinates);

              if (!point) {
                return null;
              }

              return (
                <g key={country.code} transform={`translate(${point[0]} ${point[1]})`}>
                  <circle r={4.5} className="tiny-marker" />
                  <title>{getCountryName(country, language)}</title>
                </g>
              );
            })}
          </svg>
        )}
        {mapError && <div className="map-error" role="alert">{messages[mapError]}</div>}
      </section>

      <img className="app-logo" src="/logo.png" alt="Been There" />

      {isToolbarCollapsed ? (
        <button
          type="button"
          className="toolbar-toggle"
          onClick={() => setIsToolbarCollapsed(false)}
          aria-label={messages.expandToolbar}
          title={messages.expandToolbar}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
      ) : (
        <div className="toolbar" aria-label="Map actions">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => setIsToolbarCollapsed(true)}
            aria-label={messages.collapseToolbar}
            title={messages.collapseToolbar}
          >
            <ChevronRight aria-hidden="true" />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => setIsModalOpen(true)}
            aria-label={messages.countriesButton}
            title={messages.countriesButton}
          >
            <ListChecks aria-hidden="true" />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={toggleMapProjection}
            aria-label={projectionToggleLabel}
            title={projectionToggleLabel}
            disabled={!canToggleGlobe}
          >
            {mapProjection === 'globe' ? <Earth aria-hidden="true" /> : <MapIcon aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={copyShareLink}
            aria-label={messages.copyLink}
            title={messages.copyLink}
          >
            <LinkIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={exportPng}
            aria-label={messages.exportPng}
            title={messages.exportPng}
          >
            <Download aria-hidden="true" />
          </button>
          <button
            type="button"
            className="toolbar-button toolbar-button--text"
            onClick={toggleLanguage}
            aria-label={messages.languageLabel}
            title={messages.languageLabel}
          >
            <Languages aria-hidden="true" />
            <span>{language.toUpperCase()}</span>
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={toggleMapStyle}
            aria-label={messages.styleToggleLabel}
            title={messages.styleToggleLabel}
          >
            {mapStyle === 'dark' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
          </button>
        </div>
      )}

      {(copyStatus || exportStatus) && (
        <div className="status" role="status">
          {[copyStatus, exportStatus].filter(Boolean).join(' · ')}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsModalOpen(false)}>
          <section
            className="country-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="countries-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <h1 id="countries-title">{messages.modalTitle}</h1>
                <p>{messages.modalSummary(visited.size, COUNTRIES.length)}</p>
              </div>
              <button type="button" className="icon-button" aria-label={messages.close} onClick={() => setIsModalOpen(false)}>
                ×
              </button>
            </header>

            <div className="modal-tools">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={messages.searchPlaceholder}
                autoFocus
              />
              <button type="button" onClick={toggleAllCountries}>
                {visited.size === COUNTRIES.length ? messages.clear : messages.selectAll}
              </button>
            </div>

            <div className="country-list">
              {filteredCountries.map((country) => (
                <label key={country.code} className="country-row">
                  <input
                    type="checkbox"
                    checked={visited.has(country.code)}
                    onChange={() => toggleCountry(country.code)}
                  />
                  <span>{country.displayName}</span>
                  <small>{country.code}</small>
                </label>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
