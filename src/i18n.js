import isoCountries from 'i18n-iso-countries';
import enCountries from 'i18n-iso-countries/langs/en.json';
import ruCountries from 'i18n-iso-countries/langs/ru.json';

isoCountries.registerLocale(enCountries);
isoCountries.registerLocale(ruCountries);

export const MESSAGES = {
  en: {
    countriesButton: 'Countries',
    copyLink: 'Copy link',
    copied: 'Link copied',
    copyFailed: 'Copy failed',
    exportPng: 'Export PNG',
    preparing: 'Preparing...',
    exported: 'Exported',
    exportFailed: 'Export failed',
    mapLoading: 'Loading map...',
    mapError: 'Mapbox map failed to load',
    mapboxTokenMissing: 'Add MAPBOX_TOKEN to .env to use Mapbox',
    webglUnavailable: 'WebGL is unavailable, Mapbox cannot be used',
    mapStageLabel: 'Been There world map',
    mapLabel: 'World map',
    modalTitle: 'Been There',
    modalSummary: (selected, total) => `${selected} countries selected from ${total} in the list`,
    close: 'Close',
    searchPlaceholder: 'Search country or ISO code',
    clear: 'Clear',
    selectAll: 'Select all',
    languageLabel: 'Switch language',
    styleToggleLabel: 'Switch day/night mode',
    globeToggleLabel: 'Switch to globe view',
    flatToggleLabel: 'Switch to flat map',
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
    mapLoading: 'Загружаю карту...',
    mapError: 'Не удалось загрузить карту Mapbox',
    mapboxTokenMissing: 'Добавьте MAPBOX_TOKEN в .env, чтобы использовать Mapbox',
    webglUnavailable: 'WebGL недоступен, Mapbox нельзя использовать',
    mapStageLabel: 'Карта мира с посещенными странами',
    mapLabel: 'Карта мира',
    modalTitle: 'Посещенные страны',
    modalSummary: (selected, total) => `Выбрано ${selected} стран из ${total} в списке`,
    close: 'Закрыть',
    searchPlaceholder: 'Поиск страны или ISO-кода',
    clear: 'Очистить',
    selectAll: 'Выделить все',
    languageLabel: 'Сменить язык',
    styleToggleLabel: 'Сменить режим день/ночь',
    globeToggleLabel: 'Переключить на глобус',
    flatToggleLabel: 'Переключить на плоскую карту',
    collapseToolbar: 'Скрыть панель',
    expandToolbar: 'Показать панель',
  },
};

export function getCountryName(country, language) {
  return isoCountries.getName(country.code, language) ?? country.name;
}
