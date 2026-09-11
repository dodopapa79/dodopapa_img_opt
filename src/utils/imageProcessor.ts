import JSZip from 'jszip';
import { OptimizationSettings, OutputFormat, WatermarkConfig } from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\u3131-\u318E\uAC00-\uD7A3\-]+/g, '') // Keep alphanumeric, Korean characters and hyphens
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

export function generateFilename(
  prefix: string,
  index: number,
  format: OutputFormat,
  shouldSlugify: boolean,
  padding: number = 2,
  startNum: number = 1
): string {
  const cleanPrefix = shouldSlugify ? slugify(prefix || 'blog-image') : (prefix || 'blog-image').trim();
  const num = (startNum + index).toString().padStart(padding, '0');
  const ext = format === 'webp' ? 'webp' : format === 'jpeg' ? 'jpg' : 'png';
  return `${cleanPrefix}_${num}.${ext}`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export function getMimeType(format: OutputFormat): string {
  switch (format) {
    case 'webp':
      return 'image/webp';
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'image/webp';
  }
}

/**
 * High-quality multi-step downscaling to avoid blurriness / fuzziness when shrinking large images.
 * Keeps text edges razor sharp instead of muddying with single-step bilinear interpolation.
 */
function drawScaledImageHighQuality(
  ctx: CanvasRenderingContext2D,
  sourceImg: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let currentW = sw;
  let currentH = sh;

  // If reduction is minor (less than 2x), draw directly with high quality
  if (currentW / dw < 2 && currentH / dh < 2) {
    ctx.drawImage(sourceImg, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }

  // Multi-step downscale: half-step until close to destination size
  let tempCanvas = document.createElement('canvas');
  tempCanvas.width = currentW;
  tempCanvas.height = currentH;
  let tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    ctx.drawImage(sourceImg, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = 'high';
  tempCtx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, currentW, currentH);

  while (currentW * 0.5 > dw && currentH * 0.5 > dh) {
    const nextW = Math.round(currentW * 0.5);
    const nextH = Math.round(currentH * 0.5);
    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = nextW;
    nextCanvas.height = nextH;
    const nextCtx = nextCanvas.getContext('2d');
    if (!nextCtx) break;
    nextCtx.imageSmoothingEnabled = true;
    nextCtx.imageSmoothingQuality = 'high';
    nextCtx.drawImage(tempCanvas, 0, 0, currentW, currentH, 0, 0, nextW, nextH);

    tempCanvas = nextCanvas;
    currentW = nextW;
    currentH = nextH;
  }

  ctx.drawImage(tempCanvas, 0, 0, currentW, currentH, dx, dy, dw, dh);
}

/**
 * Optimizes an image based on provided settings
 */
export async function processAndOptimizeImage(
  dataUrl: string,
  settings: OptimizationSettings,
  aspectRatioValue?: number // e.g. 1.0, 16/9, 3/4
): Promise<{
  blob: Blob;
  dataUrl: string;
  size: number;
  width: number;
  height: number;
}> {
  const img = await loadImage(dataUrl);

  let sourceX = 0;
  let sourceY = 0;
  let sourceW = img.naturalWidth;
  let sourceH = img.naturalHeight;

  // Check if image width is smaller than the configured max width and padding is requested
  const maxDim = settings.maxWidthOption !== 'original' ? parseInt(settings.maxWidthOption, 10) : null;
  const isWidthBelowTarget = Boolean(
    maxDim &&
    settings.padSmallImages &&
    img.naturalWidth < maxDim
  );

  let canvasW: number;
  let canvasH: number;
  let drawX = 0;
  let drawY = 0;
  let drawW: number;
  let drawH: number;
  let usePadding = false;

  if (isWidthBelowTarget && maxDim) {
    usePadding = true;
    canvasW = maxDim;

    // 세로는 정사각형으로 커지지 않고 원본 비율을 유지하며 상하에 깔끔한 슬림 여백(24~36px)만 부여
    const verticalPadding = Math.min(40, Math.max(20, Math.round(img.naturalHeight * 0.05)));
    canvasH = img.naturalHeight + verticalPadding * 2;
    drawW = img.naturalWidth;
    drawH = img.naturalHeight;
    drawX = Math.round((canvasW - drawW) / 2);
    drawY = verticalPadding;
  } else {
    // Normal flow: Crop to ratio if specified
    if (aspectRatioValue && aspectRatioValue > 0) {
      const currentRatio = sourceW / sourceH;
      if (Math.abs(currentRatio - aspectRatioValue) > 0.01) {
        if (currentRatio > aspectRatioValue) {
          // Image is wider than target ratio: crop sides
          const newW = sourceH * aspectRatioValue;
          sourceX = (sourceW - newW) / 2;
          sourceW = newW;
        } else {
          // Image is taller than target ratio: crop top/bottom
          const newH = sourceW / aspectRatioValue;
          sourceY = (sourceH - newH) / 2;
          sourceH = newH;
        }
      }
    }

    // Calculate destination dimensions based on maxWidthOption
    let targetW = sourceW;
    let targetH = sourceH;

    if (maxDim && targetW > maxDim) {
      const scale = maxDim / targetW;
      targetW = maxDim;
      targetH = Math.round(targetH * scale);
    }

    canvasW = Math.max(1, Math.round(targetW));
    canvasH = Math.max(1, Math.round(targetH));
    drawW = canvasW;
    drawH = canvasH;
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // If using padding for smaller images, fill with light gray background
  if (usePadding) {
    ctx.fillStyle = settings.padColor || '#F4F4F5';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Smooth high quality scaling (maintains crisp text)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (usePadding) {
    drawScaledImageHighQuality(
      ctx,
      img,
      0,
      0,
      img.naturalWidth,
      img.naturalHeight,
      drawX,
      drawY,
      drawW,
      drawH
    );
  } else {
    // Draw cropped/scaled image with high quality multi-step downsampling
    drawScaledImageHighQuality(
      ctx,
      img,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      drawW,
      drawH
    );
  }

  // Apply watermark if configured and enabled
  if (settings.watermark && settings.watermark.enabled) {
    await applyWatermarkToCanvas(ctx, canvasW, canvasH, settings.watermark);
  }

  const mimeType = getMimeType(settings.format);
  const quality = settings.format === 'png' ? 1.0 : Math.min(1.0, Math.max(0.1, settings.quality / 100));

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas blob conversion failed'));
          return;
        }
        const outputDataUrl = URL.createObjectURL(blob);
        resolve({
          blob,
          dataUrl: outputDataUrl,
          size: blob.size,
          width: canvasW,
          height: canvasH,
        });
      },
      mimeType,
      quality
    );
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function createZipAndDownload(
  images: { filename: string; blob: Blob | null; dataUrl: string }[],
  zipFilename = 'blog-images-optimized.zip'
): Promise<void> {
  const zip = new JSZip();

  for (const item of images) {
    if (item.blob) {
      zip.file(item.filename, item.blob);
    } else if (item.dataUrl) {
      const res = await fetch(item.dataUrl);
      const blob = await res.blob();
      zip.file(item.filename, blob);
    }
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  downloadBlob(content, zipFilename);
}

/**
 * Renders text or image watermark at one of 4 corners (top-left, top-right, bottom-left, bottom-right)
 */
export async function applyWatermarkToCanvas(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  watermark: WatermarkConfig
): Promise<void> {
  if (!watermark || !watermark.enabled) return;

  const margin = Math.max(16, Math.round(canvasW * 0.025));
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0.05, watermark.opacity ?? 0.85));

  if (watermark.type === 'image' && watermark.imageDataUrl) {
    try {
      const wmImg = await loadImage(watermark.imageDataUrl);
      const scalePercent = watermark.imageScale || 18;
      const targetW = Math.max(30, Math.min(canvasW * 0.5, (canvasW * scalePercent) / 100));
      const targetH = (wmImg.naturalHeight / wmImg.naturalWidth) * targetW;

      let x = margin;
      let y = margin;
      if (watermark.position === 'top-right') {
        x = canvasW - targetW - margin;
      } else if (watermark.position === 'bottom-left') {
        y = canvasH - targetH - margin;
      } else if (watermark.position === 'bottom-right') {
        x = canvasW - targetW - margin;
        y = canvasH - targetH - margin;
      }

      ctx.drawImage(wmImg, x, y, targetW, targetH);
    } catch (err) {
      console.warn('Failed to render watermark image:', err);
    }
  } else if (watermark.type === 'text' && watermark.text && watermark.text.trim()) {
    const scaleFactor = canvasW / 1000;
    const baseSize = watermark.fontSize || 22;
    const calcFontSize = Math.max(13, Math.round(baseSize * Math.max(0.7, Math.min(2.0, scaleFactor))));

    ctx.font = `bold ${calcFontSize}px Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const metrics = ctx.measureText(watermark.text);
    const textW = metrics.width;
    const padX = Math.round(calcFontSize * 0.5);
    const padY = Math.round(calcFontSize * 0.32);
    const boxW = textW + padX * 2;
    const boxH = calcFontSize + padY * 2;

    let boxX = margin;
    let boxY = margin;
    if (watermark.position === 'top-right') {
      boxX = canvasW - boxW - margin;
    } else if (watermark.position === 'bottom-left') {
      boxY = canvasH - boxH - margin;
    } else if (watermark.position === 'bottom-right') {
      boxX = canvasW - boxW - margin;
      boxY = canvasH - boxH - margin;
    }

    if (watermark.textBg && watermark.textBg !== 'none') {
      ctx.fillStyle = watermark.textBg === 'light' ? 'rgba(255, 255, 255, 0.88)' : 'rgba(0, 0, 0, 0.72)';
      ctx.beginPath();
      const radius = 6;
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    }

    ctx.fillStyle = watermark.textColor || '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(watermark.text, boxX + padX, boxY + boxH / 2);
  }

  ctx.restore();
}
