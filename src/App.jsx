import React from 'react';
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
import { COUNTRIES } from './countries.js';
import { MESSAGES, getCountryName } from './i18n.js';
import { exportMapPng } from './mapExport.js';
import {
  addMapboxAttribution,
  addVisitedLayers,
  applyMapProjection,
  canUseMapbox,
  createMapboxMap,
  getMapboxStyleUrl,
  getMapboxUnavailableReason,
  syncMapZoomToViewport,
  updateVisitedLayers,
} from './mapboxMap.js';
import { parseStateFromUrl, writeStateToUrl } from './urlState.js';

export function App() {
  const [initialUrlState] = React.useState(parseStateFromUrl);
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
  const [mapError, setMapError] = React.useState(getMapboxUnavailableReason);
  const [mapLoading, setMapLoading] = React.useState(canUseMapbox);
  const mapboxRef = React.useRef(null);
  const mapboxContainerRef = React.useRef(null);
  const activeMapStyleRef = React.useRef(null);
  const mapStyleRef = React.useRef(mapStyle);
  const mapProjectionRef = React.useRef(mapProjection);
  const visitedRef = React.useRef(visited);

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
    if (!canUseMapbox() || !mapboxContainerRef.current) {
      return undefined;
    }

    setMapError('');
    setMapLoading(true);

    const map = createMapboxMap(
      mapboxContainerRef.current,
      mapStyleRef.current,
      mapProjectionRef.current,
    );

    mapboxRef.current = map;
    activeMapStyleRef.current = mapStyleRef.current;
    addMapboxAttribution(map);

    const syncViewport = () => {
      map.resize();
      syncMapZoomToViewport(map, mapboxContainerRef.current);
    };
    const resizeObserver = new ResizeObserver(syncViewport);

    resizeObserver.observe(mapboxContainerRef.current);
    window.visualViewport?.addEventListener('resize', syncViewport);

    const onLoad = () => {
      syncMapZoomToViewport(map, mapboxContainerRef.current);
      applyMapProjection(map, mapProjectionRef.current);
      addVisitedLayers(map, visitedRef.current);
      map.once('idle', () => setMapLoading(false));
    };
    const onError = () => {
      setMapLoading(false);
      setMapError('mapError');
    };

    map.on('load', onLoad);
    map.on('error', onError);

    return () => {
      resizeObserver.disconnect();
      window.visualViewport?.removeEventListener('resize', syncViewport);
      mapboxRef.current = null;
      activeMapStyleRef.current = null;
      map.remove();
    };
  }, []);

  React.useEffect(() => {
    const map = mapboxRef.current;

    if (!map || activeMapStyleRef.current === mapStyle) {
      return;
    }

    activeMapStyleRef.current = mapStyle;
    setMapLoading(true);
    map.setStyle(getMapboxStyleUrl(mapStyle));
    map.once('style.load', () => {
      applyMapProjection(map, mapProjectionRef.current);
      addVisitedLayers(map, visitedRef.current);
      updateVisitedLayers(map, visitedRef.current);
      map.once('idle', () => setMapLoading(false));
    });
  }, [mapStyle]);

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
    if (!mapboxRef.current) {
      return;
    }

    setExportStatus(messages.preparing);

    try {
      await exportMapPng(mapboxRef.current);
      setExportStatus(messages.exported);
    } catch {
      setExportStatus(messages.exportFailed);
    }
  };

  const projectionToggleLabel = mapProjection === 'globe'
    ? messages.flatToggleLabel
    : messages.globeToggleLabel;
  const shouldRenderMapbox = canUseMapbox();

  return (
    <main className="app-shell">
      <section className="map-stage" aria-label={messages.mapStageLabel}>
        {shouldRenderMapbox && (
          <div ref={mapboxContainerRef} className="mapbox-map" role="img" aria-label={messages.mapLabel} />
        )}

        {mapLoading && !mapError && (
          <div className="map-loading" role="status" aria-live="polite">
            <span className="map-loading__spinner" aria-hidden="true" />
            <span>{messages.mapLoading}</span>
          </div>
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
