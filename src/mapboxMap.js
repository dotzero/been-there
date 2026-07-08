import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { COUNTRY_BY_CODE, TINY_COUNTRY_CODES } from './countries.js';
import { MAPBOX_STYLES, MAPBOX_TOKEN } from './config.js';

const COUNTRIES_SOURCE_ID = 'visited-country-boundaries';
const MAPBOX_COUNTRIES_SOURCE_URL = 'mapbox://mapbox.country-boundaries-v1';
const MAPBOX_COUNTRIES_SOURCE_LAYER = 'country_boundaries';
const VISITED_FILL_LAYER_ID = 'visited-country-fill';
const VISITED_LINE_LAYER_ID = 'visited-country-line';
const TINY_SOURCE_ID = 'visited-tiny-countries';
const TINY_LAYER_ID = 'visited-tiny-country-markers';
const VISITED_PATTERN_ID = 'visited-stripes';
const MAP_CENTER = [10, 18];
const MAP_BASE_ZOOM = 1.15;
const MAP_MIN_ZOOM = 1;
const MAP_MAX_ZOOM = 5;
const MAP_MAX_BOUNDS = [
  [-180, -60],
  [180, 82],
];
const MAPBOX_WORLD_SIZE = 512;
const MERCATOR_MAX_LATITUDE = 85.0511287798066;

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

function getMercatorY(latitude) {
  const clampedLatitude = Math.max(
    -MERCATOR_MAX_LATITUDE,
    Math.min(MERCATOR_MAX_LATITUDE, latitude),
  );
  const latitudeRadians = (clampedLatitude * Math.PI) / 180;

  return (
    1 -
    Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI
  ) / 2;
}

function getMapBoundsHeightZoom(container) {
  const viewportHeight = container?.clientHeight ?? window.innerHeight;
  const viewportWidth = container?.clientWidth ?? window.innerWidth;

  if (viewportHeight <= viewportWidth) {
    return MAP_MIN_ZOOM;
  }

  const [[, south], [, north]] = MAP_MAX_BOUNDS;
  const boundsHeight = Math.abs(getMercatorY(south) - getMercatorY(north)) * MAPBOX_WORLD_SIZE;

  if (boundsHeight <= 0) {
    return MAP_MIN_ZOOM;
  }

  return Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, Math.log2(viewportHeight / boundsHeight)));
}

function getResponsiveMinZoom(container) {
  return Math.max(MAP_MIN_ZOOM, getMapBoundsHeightZoom(container));
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

export function canUseMapbox() {
  if (!MAPBOX_TOKEN || !mapboxgl.supported()) {
    return false;
  }

  return true;
}

export function getMapboxUnavailableReason() {
  if (!MAPBOX_TOKEN) {
    return 'mapboxTokenMissing';
  }

  return mapboxgl.supported() ? '' : 'webglUnavailable';
}

export function getMapboxStyleUrl(mapStyle) {
  return MAPBOX_STYLES[mapStyle];
}

export function createMapboxMap(container, mapStyle, mapProjection) {
  mapboxgl.accessToken = MAPBOX_TOKEN;

  const initialMinZoom = getResponsiveMinZoom(container);

  return new mapboxgl.Map({
    container,
    style: getMapboxStyleUrl(mapStyle),
    center: MAP_CENTER,
    zoom: Math.max(MAP_BASE_ZOOM, initialMinZoom),
    minZoom: initialMinZoom,
    maxZoom: MAP_MAX_ZOOM,
    maxBounds: MAP_MAX_BOUNDS,
    projection: getMapboxProjectionName(mapProjection),
    renderWorldCopies: false,
    preserveDrawingBuffer: true,
    attributionControl: false,
    logoPosition: 'bottom-right',
  });
}

export function addMapboxAttribution(map) {
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
}

export function applyMapProjection(map, mapProjection) {
  map.setProjection(getMapboxProjectionName(mapProjection));
  map.setFog(getMapboxFog(mapProjection));
}

export function syncMapZoomToViewport(map, container) {
  const minZoom = getResponsiveMinZoom(container);

  map.setMinZoom(minZoom);

  if (map.getZoom() < minZoom) {
    map.jumpTo({
      center: MAP_CENTER,
      zoom: minZoom,
    });
  }
}

export function addVisitedLayers(map, visited) {
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

export function updateVisitedLayers(map, visited) {
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
