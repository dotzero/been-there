# Been There

![](./public/logo.png)

BeenThere is a simple way to visualize the countries you've visited on an interactive world map.

Select countries, track your travels, and instantly generate a shareable map that others can view with a single link.

## Features

- 🌍 Interactive world map
- ✅ Mark visited countries
- 🔗 Share your map via URL
- 🖼️ Export your map as a PNG image
- 🔒 Fully private — no accounts, no backend, no tracking
- 💾 All data is stored directly in the URL

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

## Docker

Run the published image from GitHub Container Registry:

```bash
docker run --rm -p 8080:80 -e MAPBOX_TOKEN=pk.your_public_mapbox_token_here ghcr.io/dotzero/been-there:latest
```

Open:

```text
http://localhost:8080/
```

Run with Docker Compose:

```bash
MAPBOX_TOKEN=pk.your_public_mapbox_token_here docker compose up
```

## License

[MIT](https://opensource.org/license/mit)
