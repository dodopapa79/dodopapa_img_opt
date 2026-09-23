import { ExtractedImageItem, ExtractionResult } from '../types';
import JSZip from 'jszip';
import { downloadBlob } from './imageProcessor';

function detectFormatFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'jpg';
    if (pathname.endsWith('.png')) return 'png';
    if (pathname.endsWith('.webp')) return 'webp';
    if (pathname.endsWith('.gif')) return 'gif';
    if (pathname.endsWith('.svg')) return 'svg';
    if (pathname.endsWith('.avif')) return 'avif';
    if (pathname.endsWith('.bmp')) return 'bmp';
    if (pathname.endsWith('.ico')) return 'ico';
  } catch {
    // ignore
  }
  return 'jpg';
}

export function detectMallType(url: string): 'coupang' | 'naver' | 'aliexpress' | 'general' {
  const low = url.toLowerCase();
  if (low.includes('coupang.com') || low.includes('coupangcdn.com')) return 'coupang';
  if (low.includes('naver.com') || low.includes('pstatic.net')) return 'naver';
  if (low.includes('aliexpress.com') || low.includes('alicdn.com')) return 'aliexpress';
  return 'general';
}

/**
 * Converts low-res CDN thumbnails into original high-resolution studio photos
 */
export function upgradeToHighResolutionUrl(url: string): string {
  try {
    let upgraded = url.trim();

    // Coupang thumbnails: /thumbnails/remote/230x230ex/image/... -> strip thumbnail constraint
    if (upgraded.includes('coupangcdn.com')) {
      upgraded = upgraded.replace(/\/thumbnails\/remote\/\d+x\d+ex\//, '/');
      upgraded = upgraded.replace(/\/thumbnails\/remote\/q\d+\//, '/');
      upgraded = upgraded.replace(/\?q=\d+$/, '');
    }

    // Naver SmartStore / Shopping: ?type=f640, ?type=m510 -> ?type=o (original)
    if (upgraded.includes('pstatic.net')) {
      if (upgraded.includes('?type=')) {
        upgraded = upgraded.replace(/\?type=[a-zA-Z0-9_-]+/, '?type=o');
      }
    }

    // AliExpress: _220x220.jpg or _Q90.jpg_.webp -> strip thumbnail sizing
    if (upgraded.includes('alicdn.com')) {
      upgraded = upgraded.replace(/_\d+x\d+\.(?:jpg|png|webp)/g, '');
      upgraded = upgraded.replace(/_\.(?:webp|jpg)$/g, '');
      upgraded = upgraded.replace(/_Q\d+\.jpg$/g, '');
      upgraded = upgraded.replace(/_\d+x\d+Q\d+\.jpg$/g, '');
    }

    // 11st: /t/300/ -> /t/original/
    if (upgraded.includes('011st.com')) {
      upgraded = upgraded.replace(/\/t\/\d+\//, '/t/original/');
    }

    return upgraded;
  } catch {
    return url;
  }
}

export function normalizeUrlClient(candidate: string, baseUrl = 'https://custom-page.com'): string | null {
  try {
    const trimmed = candidate.trim().replace(/^['"]|['"]$/g, '');
    if (!trimmed || trimmed.startsWith('javascript:') || trimmed.startsWith('mailto:')) {
      return null;
    }
    if (trimmed.startsWith('data:')) {
      return trimmed.startsWith('data:image/') ? trimmed : null;
    }
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * Client-side DOM & Text parser that extracts images from HTML, including shopping JSON data
 */
export function parseImagesFromHtmlClient(html: string, pageUrl = 'https://custom-page.com'): ExtractionResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let pageTitle = doc.title ? doc.title.trim() : '';
  let favicon = '';

  try {
    const iconLink = doc.querySelector('link[rel~="icon"]') as HTMLLinkElement | null;
    if (iconLink && iconLink.href) {
      favicon = normalizeUrlClient(iconLink.href, pageUrl) || '';
    }
    if (!pageTitle && pageUrl.startsWith('http')) {
      pageTitle = new URL(pageUrl).hostname;
    }
  } catch {
    // ignore
  }

  const images: ExtractedImageItem[] = [];
  const seenUrls = new Set<string>();

  const addImage = (
    rawUrl: string,
    alt: string,
    type: ExtractedImageItem['type'],
    sourceMall?: ExtractedImageItem['sourceMall']
  ) => {
    const normalized = normalizeUrlClient(rawUrl, pageUrl);
    if (!normalized) return;

    // Filter trackers and spacer pixels
    if (
      normalized.includes('1x1') ||
      normalized.includes('spacer.gif') ||
      normalized.includes('blank.gif') ||
      normalized.includes('pixel.gif') ||
      normalized.includes('beacon')
    ) {
      return;
    }

    const highRes = upgradeToHighResolutionUrl(normalized);
    const finalUrl = highRes || normalized;

    if (seenUrls.has(finalUrl)) return;
    seenUrls.add(finalUrl);

    images.push({
      id: `ext-img-${images.length + 1}`,
      url: finalUrl,
      originalUrl: highRes !== normalized ? normalized : undefined,
      previewUrl: `/api/proxy-image?url=${encodeURIComponent(finalUrl)}`,
      alt: alt ? alt.trim() : '',
      format: detectFormatFromUrl(finalUrl),
      type,
      sourceMall: sourceMall || detectMallType(finalUrl),
      isHighRes: highRes !== normalized,
      selected: true,
    });
  };

  // 1. Meta OG & Twitter
  const ogImg = doc.querySelector(
    'meta[property="og:image"], meta[name="og:image"], meta[name="twitter:image"]'
  ) as HTMLMetaElement | null;
  if (ogImg && ogImg.content) {
    addImage(ogImg.content, '대표 썸네일 (og:image)', 'og:image');
  }

  // 2. <img> tags with lazy load attributes
  const imgElements = Array.from(doc.querySelectorAll('img'));
  for (const img of imgElements) {
    const alt = img.getAttribute('alt') || '';
    const src = img.getAttribute('src');
    if (src) addImage(src, alt, 'img');

    const lazyAttrs = [
      'data-src',
      'data-original',
      'data-lazy-src',
      'data-actualsrc',
      'data-orig-file',
      'data-full-url',
      'data-highres',
      'data-img-url',
      'data-magnify-src',
      'data-zoom-image',
    ];
    for (const attr of lazyAttrs) {
      const val = img.getAttribute(attr);
      if (val) addImage(val, alt, 'img');
    }

    const srcset = img.getAttribute('srcset');
    if (srcset) {
      const parts = srcset.split(',');
      for (const p of parts) {
        const u = p.trim().split(/\s+/)[0];
        if (u) addImage(u, alt, 'img');
      }
    }
  }

  // 3. <picture> <source> tags
  const sources = Array.from(doc.querySelectorAll('source'));
  for (const s of sources) {
    const srcset = s.getAttribute('srcset');
    if (srcset) {
      const parts = srcset.split(',');
      for (const p of parts) {
        const u = p.trim().split(/\s+/)[0];
        if (u) addImage(u, '', 'picture');
      }
    }
  }

  // 4. <script> tags deep regex scan for shopping CDN images (Coupang, Naver, AliExpress)
  const scripts = Array.from(doc.querySelectorAll('script'));
  for (const s of scripts) {
    const text = s.textContent || '';
    if (text.length > 20 && (text.includes('http') || text.includes('cdn'))) {
      const jsonImgRegex = /https?:\\?\/\\?\/[a-zA-Z0-9_.~:/?#[\]@!$&'()*+,;=-]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[a-zA-Z0-9_.~:/?#[\]@!$&'()*+,;=-]*)?/gi;
      const matches = text.match(jsonImgRegex);
      if (matches) {
        for (const m of matches) {
          const clean = m.replace(/\\\/|\\u002F/gi, '/').replace(/\\"/g, '').trim();
          if (!clean.includes('.js') && !clean.includes('font') && clean.length > 12) {
            addImage(clean, '상품 상세/옵션 이미지', 'product');
          }
        }
      }
    }
  }

  // 5. Also perform global raw regex search on the raw HTML for any missed CDN URLs
  const rawShoppingCdnRegex = /https?:\/\/[a-zA-Z0-9_.~:/?#[\]@!$&'()*+,;=-]*(?:coupangcdn\.com|pstatic\.net|alicdn\.com|011st\.com|gmarket\.co\.kr)[a-zA-Z0-9_.~:/?#[\]@!$&'()*+,;=-]*\.(?:jpg|jpeg|png|webp)(?:\?[a-zA-Z0-9_.~:/?#[\]@!$&'()*+,;=-]*)?/gi;
  const rawMatches = html.match(rawShoppingCdnRegex);
  if (rawMatches) {
    for (const rawUrl of rawMatches) {
      addImage(rawUrl, '쇼핑몰 고화질 이미지', 'product');
    }
  }

  return {
    success: true,
    pageTitle: pageTitle || '추출된 웹페이지 이미지',
    pageUrl,
    favicon,
    images,
    totalCount: images.length,
  };
}

/**
 * Extracts images from a plain list of URLs or text snippet containing image links
 */
export function parseImagesFromRawText(text: string): ExtractionResult {
  const images: ExtractedImageItem[] = [];
  const seenUrls = new Set<string>();

  const urlRegex = /https?:\/\/[^\s"'<>\\]+\.(?:jpg|jpeg|png|webp|gif|svg|avif)(?:\?[^\s"'<>\\]*)?/gi;
  const matches = text.match(urlRegex) || [];

  for (const rawUrl of matches) {
    const highRes = upgradeToHighResolutionUrl(rawUrl);
    const finalUrl = highRes || rawUrl;
    if (seenUrls.has(finalUrl)) continue;
    seenUrls.add(finalUrl);

    images.push({
      id: `ext-img-${images.length + 1}`,
      url: finalUrl,
      originalUrl: highRes !== rawUrl ? rawUrl : undefined,
      previewUrl: `/api/proxy-image?url=${encodeURIComponent(finalUrl)}`,
      alt: '입력된 이미지',
      format: detectFormatFromUrl(finalUrl),
      type: 'img',
      sourceMall: detectMallType(finalUrl),
      isHighRes: highRes !== rawUrl,
      selected: true,
    });
  }

  return {
    success: true,
    pageTitle: '직접 입력한 이미지 목록',
    pageUrl: '',
    images,
    totalCount: images.length,
  };
}

/**
 * Main URL Extraction function with smart fallbacks
 */
export async function extractImagesFromUrl(targetUrl: string): Promise<ExtractionResult> {
  let url = targetUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // 1. Try local Express Backend /api/extract-images
  try {
    const res = await fetch('/api/extract-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data: ExtractionResult = await res.json();
    if (data.isProtectedShoppingSite) {
      return data;
    }
    if (data.success && Array.isArray(data.images)) {
      return data;
    }
    if (data.error) {
      throw new Error(data.error);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('차단')) {
      throw err;
    }
    console.warn('Backend extract failed, trying client CORS proxies...', err);
  }

  // 2. Client-side CORS proxy fallback for blogs, wiki, articles
  const proxyEndpoints = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  let lastError = '웹페이지를 불러오지 못했습니다.';
  for (const proxyUrl of proxyEndpoints) {
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) continue;

      const html = await res.text();
      const parsed = parseImagesFromHtmlClient(html, url);
      if (parsed.images.length > 0) {
        return parsed;
      }
    } catch (e: any) {
      lastError = e.message || lastError;
    }
  }

  throw new Error(lastError || '페이지에서 이미지를 찾을 수 없거나 접근이 차단되었습니다.');
}

/**
 * Downloads image as a Blob with multi-layer proxy fallback
 */
export async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  if (imageUrl.startsWith('data:')) {
    const res = await fetch(imageUrl);
    return await res.blob();
  }

  // 1. Local backend proxy with custom Referer header
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.blob();
    }
  } catch {
    // continue to direct fetch
  }

  // 2. Direct fetch with no-referrer
  try {
    const res = await fetch(imageUrl, {
      mode: 'cors',
      referrerPolicy: 'no-referrer',
    });
    if (res.ok) {
      return await res.blob();
    }
  } catch {
    // continue to CORS proxy
  }

  // 3. Public CORS proxies
  const corsProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`,
  ];

  for (const p of corsProxies) {
    try {
      const res = await fetch(p);
      if (res.ok) {
        return await res.blob();
      }
    } catch {
      // ignore
    }
  }

  throw new Error(`이미지 데이터를 다운로드할 수 없습니다: ${imageUrl}`);
}

export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
}

export async function downloadExtractedImagesAsZip(
  images: ExtractedImageItem[],
  zipTitle = 'extracted-images'
): Promise<void> {
  const zip = new JSZip();
  const folderName = zipTitle.replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 30) || 'web_images';
  const folder = zip.folder(folderName) || zip;

  let index = 1;
  for (const item of images) {
    try {
      const blob = await fetchImageBlob(item.url);
      let ext = item.format || 'jpg';
      if (ext === 'image' || !ext) {
        ext = blob.type.split('/')[1] || 'jpg';
      }
      if (ext === 'jpeg') ext = 'jpg';

      const padNum = String(index).padStart(2, '0');
      const filename = `image_${padNum}.${ext}`;
      folder.file(filename, blob);
      index++;
    } catch (err) {
      console.warn(`Skipping failed image in zip: ${item.url}`, err);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `${folderName}.zip`);
}

/**
 * Generates bookmarklet JavaScript string that works in Chrome, Whale, Edge, Safari
 */
export function generateBookmarkletCode(appUrl: string): string {
  const code = `
javascript:(function(){
  try {
    var urls = new Set();
    document.querySelectorAll('img').forEach(function(img){
      [img.src, img.getAttribute('data-src'), img.getAttribute('data-original'), img.getAttribute('data-lazy-src'), img.getAttribute('data-actualsrc')]
        .filter(Boolean).forEach(function(u){ urls.add(u); });
      var srcset = img.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach(function(p){
          var c = p.trim().split(/\\s+/)[0];
          if (c) urls.add(c);
        });
      }
    });
    document.querySelectorAll('*').forEach(function(el){
      var bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg.indexOf('url(') !== -1) {
        var m = bg.match(/url\\(["']?([^"')]+)["']?\\)/);
        if (m && m[1]) urls.add(m[1]);
      }
    });
    document.querySelectorAll('script').forEach(function(s){
      var t = s.textContent || '';
      if (t.length > 30 && (t.indexOf('cdn') !== -1 || t.indexOf('jpg') !== -1 || t.indexOf('image') !== -1)) {
        var matches = t.match(/https?:\\\\?\\/\\\\?\\/[^\\s"'<>]+\\.(?:jpg|jpeg|png|webp)(?:\\?[^\\s"'<>]*)?/gi);
        if (matches) {
          matches.forEach(function(u){
            urls.add(u.replace(/\\\\\\/|\\\\u002F/g, '/').replace(/\\\\"/g, ''));
          });
        }
      }
    });
    var arr = Array.from(urls).filter(function(u){
      return u.indexOf('http') === 0 && u.indexOf('1x1') === -1 && u.indexOf('pixel') === -1;
    });
    if (arr.length === 0) {
      alert('현재 페이지에서 이미지를 발견하지 못했습니다.');
      return;
    }
    var payload = {
      title: document.title || '쇼핑몰 이미지',
      pageUrl: location.href,
      images: arr
    };
    var targetWin = window.open('${appUrl}?mode=extractor&source=bookmarklet', '_blank');
    if (targetWin) {
      var count = 0;
      var timer = setInterval(function(){
        count++;
        targetWin.postMessage({ type: 'AIS_IMAGES_TRANSFER', payload: payload }, '*');
        if (count > 20) clearInterval(timer);
      }, 500);
    } else {
      alert('팝업 차단을 해제해주세요.');
    }
  } catch(e) {
    alert('이미지 추출 오류: ' + e.message);
  }
})();
  `.trim().replace(/[\r\n\t]+/g, ' ');

  return code;
}
