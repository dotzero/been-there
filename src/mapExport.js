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

export async function exportMapPng(map) {
  map.triggerRepaint();
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const mapCanvas = map.getCanvas();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = mapCanvas.width;
  canvas.height = mapCanvas.height;
  context.drawImage(mapCanvas, 0, 0);
  await drawLogoOnCanvas(context, mapCanvas.width / mapCanvas.clientWidth);

  const link = document.createElement('a');
  link.download = 'visited-countries.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
