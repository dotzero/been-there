# Been There

![](./public/logo.png)

Been There lets you mark the countries you have visited on an interactive world map.

You can share your map with a link or save it as a PNG image. It is fully private and safe to use: there is no backend, and your selected countries are stored only in the URL.

## Features

- Interactive Mapbox world map
- 193 UN member states list
- Country picker modal with search
- Select all / clear all behavior
- Shareable URL state
- PNG export
- English and Russian UI
- Day/night map style toggle
- SVG fallback if Mapbox token or WebGL is unavailable

## URL State

The app uses query parameters:

```text
v=AAAAAAAAAAQAAEAAAAAAAAAABAAAAAAAAA
l=ru
s=dark
```

Example:

```text
/?v=AAAAAAAAAAQAAEAAAAAAAAAABAAAAAAAAA&l=ru&s=dark
```

Supported values:

- `v`: compact base64url bitmask of selected countries
- `l`: `en` or `ru`
- `s`: `standard` or `dark`

Legacy links with `c=FRA,JPN,RUS` are still supported, but new links are written with `v`.

## Setup

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env
```

Add your public Mapbox token:

```env
MAPBOX_TOKEN=pk.your_public_mapbox_token_here
```

Mapbox public tokens are safe to use in browser apps, but you should restrict the token by allowed URLs in your Mapbox account before publishing.

## Development

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/
```

## Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Notes

- The official country list is limited to the 193 UN member states.
- The app uses Mapbox country boundary vector tiles for the visited-country overlay.
- If Mapbox is unavailable, the app falls back to a static SVG world map.
- PNG export uses the current rendered map canvas in Mapbox mode.

## License

MIT
