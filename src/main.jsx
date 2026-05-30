import React from 'react';
import { createRoot } from 'react-dom/client';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { COUNTRIES, COUNTRY_BY_CODE, COUNTRY_BY_NUMERIC, TINY_COUNTRY_CODES } from './countries.js';
import './styles.css';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';
const QUERY_KEY = 'c';

function parseVisitedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(QUERY_KEY);

  if (!raw) {
    return new Set();
  }

  const codes = raw
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => COUNTRY_BY_CODE.has(code));

  return new Set(codes);
}

function writeVisitedToUrl(visited) {
  const url = new URL(window.location.href);
  const codes = [...visited].sort();
  const queryValue = codes.join(',');

  if (codes.length > 0) {
    url.search = `${QUERY_KEY}=${queryValue}`;
  } else {
    url.search = '';
  }

  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function App() {
  const [visited, setVisited] = React.useState(parseVisitedFromUrl);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [copyStatus, setCopyStatus] = React.useState('');
  const [exportStatus, setExportStatus] = React.useState('');
  const [geographies, setGeographies] = React.useState([]);
  const [mapError, setMapError] = React.useState('');
  const [mapSize, setMapSize] = React.useState({ width: 1200, height: 760 });
  const mapRef = React.useRef(null);
  const svgRef = React.useRef(null);

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

        setGeographies(feature(topology, topology.objects.countries).features);
      })
      .catch(() => {
        if (isMounted) {
          setMapError('Map data failed to load');
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
    writeVisitedToUrl(visited);
  }, [visited]);

  React.useEffect(() => {
    const onPopState = () => setVisited(parseVisitedFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCountries = React.useMemo(() => {
    if (!normalizedQuery) {
      return COUNTRIES;
    }

    return COUNTRIES.filter((country) => {
      return (
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.code.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [normalizedQuery]);

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

  const copyShareLink = async () => {
    setCopyStatus('');
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('Link copied');
    } catch {
      setCopyStatus('Copy failed');
    }
  };

  const exportPng = async () => {
    if (!svgRef.current) {
      return;
    }

    setExportStatus('Preparing...');

    try {
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
      URL.revokeObjectURL(objectUrl);

      const link = document.createElement('a');
      link.download = 'visited-countries.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      setExportStatus('Exported');
    } catch {
      setExportStatus('Export failed');
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

  return (
    <main className="app-shell">
      <section ref={mapRef} className="map-stage" aria-label="World map of visited countries">
        <svg
          ref={svgRef}
          className="world-map"
          viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
          role="img"
          aria-label="World map"
        >
          <rect width={mapSize.width} height={mapSize.height} className="ocean" />
          {geographies.map((geo) => {
            const country = COUNTRY_BY_NUMERIC.get(String(geo.id).padStart(3, '0'));
            const isVisited = country ? visited.has(country.code) : false;

            return (
              <path
                key={geo.id}
                d={path(geo)}
                className={isVisited ? 'country country--visited' : 'country'}
              >
                <title>{country?.name ?? 'Country'}</title>
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
                <title>{country.name}</title>
              </g>
            );
          })}
        </svg>
        {mapError && <div className="map-error" role="alert">{mapError}</div>}
      </section>

      <div className="toolbar" aria-label="Map actions">
        <button type="button" onClick={() => setIsModalOpen(true)}>
          Countries
          <span>{visited.size}</span>
        </button>
        <button type="button" onClick={copyShareLink}>Copy link</button>
        <button type="button" onClick={exportPng}>Export PNG</button>
      </div>

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
                <h1 id="countries-title">Visited countries</h1>
                <p>{visited.size} of {COUNTRIES.length} UN member states selected</p>
              </div>
              <button type="button" className="icon-button" aria-label="Close" onClick={() => setIsModalOpen(false)}>
                ×
              </button>
            </header>

            <div className="modal-tools">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search country or ISO code"
                autoFocus
              />
              <button type="button" onClick={() => setVisited(new Set())}>Clear</button>
            </div>

            <div className="country-list">
              {filteredCountries.map((country) => (
                <label key={country.code} className="country-row">
                  <input
                    type="checkbox"
                    checked={visited.has(country.code)}
                    onChange={() => toggleCountry(country.code)}
                  />
                  <span>{country.name}</span>
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
