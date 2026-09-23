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
      addImage(rawUrl, '고화질 원본 이미지', 'product');
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
 * Generates bookmarklet JavaScript string that works reliably in Chrome, Whale, Edge, Safari
 * Displays a centered in-page modal dialog directly on the target website
 */
export function generateBookmarkletCode(appUrl: string): string {
  const serializedAppUrl = JSON.stringify(appUrl);

  const scriptBody = String.raw`
(function(APP_URL){
  try {
    var oldB = document.getElementById("ais-bdrop"); if (oldB) oldB.remove();
    var oldM = document.getElementById("ais-modal"); if (oldM) oldM.remove();
    var oldTip = document.getElementById("ais-toast"); if (oldTip) oldTip.remove();

    var tip = document.createElement("div");
    tip.id = "ais-toast";
    tip.style.cssText = "position:fixed!important;top:20px!important;left:50%!important;transform:translateX(-50%)!important;background:#10b981!important;color:#ffffff!important;padding:10px 20px!important;border-radius:30px!important;font-size:13px!important;font-weight:700!important;z-index:2147483647!important;box-shadow:0 10px 25px rgba(0,0,0,0.5)!important;font-family:-apple-system,BlinkMacSystemFont,sans-serif!important;";
    tip.innerText = "🔍 이미지 수집 중...";
    document.body.appendChild(tip);

    var urls = []; var seen = {};
    function add(u) {
      if (!u || typeof u !== "string") return;
      var t = u.trim();
      if (!t || (t.indexOf("data:image") === 0 && t.length < 500)) return;
      if (t.indexOf("//") === 0) { t = location.protocol + t; }
      else if (t.indexOf("/") === 0) { t = location.origin + t; }
      if (t.indexOf("http") !== 0) return;
      if (t.indexOf("1x1") !== -1 || t.indexOf("pixel") !== -1 || t.indexOf("spacer") !== -1 || t.indexOf("blank.gif") !== -1) return;
      if (t.indexOf("coupangcdn.com") !== -1) {
        t = t.replace(/\/thumbnails\/remote\/\d+x\d+ex\//, "/").replace(/\/thumbnails\/remote\/q\d+\//, "/").replace(/\?q=\d+$/, "");
      }
      if (t.indexOf("pstatic.net") !== -1 && t.indexOf("?type=") !== -1) {
        t = t.replace(/\?type=[a-zA-Z0-9_-]+/, "?type=o");
      }
      if (t.indexOf("alicdn.com") !== -1) {
        t = t.replace(/_\d+x\d+\.(?:jpg|png|webp)/g, "").replace(/_\.(?:webp|jpg)$/g, "").replace(/_Q\d+\.jpg$/g, "");
      }
      if (!seen[t]) { seen[t] = true; urls.push(t); }
    }
    var imgs = document.querySelectorAll("img, picture source, [data-src], [data-original], [data-zoom-image], [data-lazy-src], [data-actualsrc]");
    for (var i = 0; i < imgs.length; i++) {
      var el = imgs[i];
      add(el.currentSrc); add(el.src);
      add(el.getAttribute("data-src")); add(el.getAttribute("data-original"));
      add(el.getAttribute("data-zoom-image")); add(el.getAttribute("data-lazy-src"));
      add(el.getAttribute("data-large-img")); add(el.getAttribute("data-high-res-img"));
      add(el.getAttribute("data-actualsrc")); add(el.getAttribute("data-img-url"));
      add(el.getAttribute("data-big"));
      var ss = el.getAttribute("srcset");
      if (ss) { var p = ss.split(","); for (var j = 0; j < p.length; j++) { add(p[j].trim().split(/\s+/)[0]); } }
    }
    var allEls = document.querySelectorAll("*");
    for (var e = 0; e < Math.min(allEls.length, 300); e++) {
      var bg = window.getComputedStyle(allEls[e]).backgroundImage;
      if (bg && bg.indexOf("url(") !== -1) {
        var match = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (match && match[1]) add(match[1]);
      }
    }
    var scripts = document.querySelectorAll("script");
    var reg = /(?:https?:)?\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|avif)/gi;
    for (var s = 0; s < scripts.length; s++) {
      var txt = scripts[s].textContent || "";
      if (txt.length > 30 && (txt.indexOf("cdn") !== -1 || txt.indexOf("jpg") !== -1 || txt.indexOf("image") !== -1 || txt.indexOf("pstatic") !== -1)) {
        var m2; while ((m2 = reg.exec(txt)) !== null) { add(m2[0]); }
      }
    }

    if (tip) tip.remove();

    var bd = document.createElement("div");
    bd.id = "ais-bdrop";
    bd.style.cssText = "position:fixed!important;inset:0!important;background:rgba(0,0,0,0.65)!important;backdrop-filter:blur(3px)!important;z-index:2147483646!important;";
    document.body.appendChild(bd);

    var modal = document.createElement("div");
    modal.id = "ais-modal";
    modal.style.cssText = "position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;width:min(480px,calc(100vw - 32px))!important;max-height:85vh!important;background:#18181b!important;color:#ffffff!important;border-radius:20px!important;box-shadow:0 25px 50px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.15)!important;z-index:2147483647!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;";

    function closeAll() {
      if (bd) bd.remove();
      if (modal) modal.remove();
    }
    bd.onclick = closeAll;

    if (urls.length === 0) {
      modal.innerHTML = '<div style="padding:24px 20px;text-align:center;display:flex;flex-direction:column;gap:12px;"><div style="font-size:32px;">⚠️</div><h3 style="font-weight:700;font-size:16px;margin:0;color:#fff;">이미지를 발견하지 못했습니다</h3><p style="font-size:12px;color:#a1a1aa;margin:0;line-height:1.6;">현재 화면에 표시된 이미지가 없습니다.<br>본문이나 상품 상세 설명 쪽으로 스크롤을 살짝 내린 후<br>북마크를 다시 클릭해주세요!</p><button id="ais-cbtn" style="margin-top:8px;padding:10px 16px;background:#27272a;color:#fff;border:1px solid #3f3f46;border-radius:10px;font-weight:600;font-size:13px;cursor:pointer;">확인</button></div>';
      document.body.appendChild(modal);
      var cbtn0 = document.getElementById("ais-cbtn");
      if (cbtn0) cbtn0.onclick = closeAll;
      return;
    }

    var head = document.createElement("div");
    head.style.cssText = "padding:16px 20px!important;background:#09090b!important;border-bottom:1px solid #27272a!important;display:flex!important;align-items:center!important;justify-content:space-between!important;";
    head.innerHTML = '<div style="display:flex;align-items:center;gap:10px;"><span style="background:#10b981;color:#fff;font-weight:800;font-size:11px;padding:3px 8px;border-radius:6px;">추출 성공</span><span style="font-weight:700;font-size:14px;">이미지 <strong style="color:#34d399;">' + urls.length + '개</strong> 발견</span></div><button id="ais-cbtn" style="background:#27272a;border:none;color:#a1a1aa;cursor:pointer;font-size:16px;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>';
    modal.appendChild(head);

    var grid = document.createElement("div");
    grid.style.cssText = "padding:12px!important;overflow-y:auto!important;max-height:220px!important;display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:8px!important;background:#121215!important;";
    for (var k = 0; k < Math.min(urls.length, 24); k++) {
      var box = document.createElement("div");
      box.style.cssText = "aspect-ratio:1!important;border-radius:8px!important;overflow:hidden!important;background:#27272a!important;border:1px solid #3f3f46!important;";
      var im = document.createElement("img");
      im.src = urls[k];
      im.style.cssText = "width:100%!important;height:100%!important;object-fit:cover!important;";
      im.setAttribute("referrerpolicy", "no-referrer");
      box.appendChild(im);
      grid.appendChild(box);
    }
    modal.appendChild(grid);

    var acts = document.createElement("div");
    acts.style.cssText = "padding:14px 20px!important;background:#09090b!important;border-top:1px solid #27272a!important;display:flex!important;flex-direction:column!important;gap:10px!important;";

    var btnOpen = document.createElement("button");
    btnOpen.style.cssText = "width:100%!important;padding:12px 16px!important;background:#10b981!important;color:#fff!important;border:none!important;border-radius:12px!important;font-weight:700!important;font-size:13px!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;box-shadow:0 4px 12px rgba(16,185,129,0.3)!important;";
    btnOpen.innerHTML = "🚀 이미지 일괄 다운로드 (최적화기에서 열기)";
    btnOpen.onclick = function() {
      try { navigator.clipboard.writeText(urls.join("\\n")); } catch(e) {}
      var targetUrl = APP_URL + "?mode=extractor&source=bookmarklet";
      var win = window.open(targetUrl, "_blank");
      if (win) {
        var cnt = 0;
        var tmr = setInterval(function() {
          cnt++;
          win.postMessage({
            type: "AIS_IMAGES_TRANSFER",
            payload: { title: document.title, pageUrl: location.href, images: urls }
          }, "*");
          if (cnt > 30) clearInterval(tmr);
        }, 400);
        btnOpen.innerHTML = "✓ 전송 완료! 새 탭을 확인하세요";
      } else {
        alert("브라우저 팝업이 차단되었습니다. 주소창 우측에서 팝업 허용을 눌러주세요!");
      }
    };
    acts.appendChild(btnOpen);

    var btnCopy = document.createElement("button");
    btnCopy.style.cssText = "width:100%!important;padding:9px 14px!important;background:#27272a!important;color:#e4e4e7!important;border:1px solid #3f3f46!important;border-radius:10px!important;font-weight:600!important;font-size:12px!important;cursor:pointer!important;";
    btnCopy.innerHTML = "📋 이미지 주소 전체 복사 (" + urls.length + "개)";
    btnCopy.onclick = function() {
      navigator.clipboard.writeText(urls.join("\\n")).then(function() {
        btnCopy.innerHTML = "✓ 클립보드 복사 완료!";
        btnCopy.style.background = "#059669";
        setTimeout(function() {
          btnCopy.innerHTML = "📋 이미지 주소 전체 복사 (" + urls.length + "개)";
          btnCopy.style.background = "#27272a";
        }, 2000);
      }).catch(function() {
        prompt("Ctrl+C를 눌러 복사하세요:", urls.join("\\n"));
      });
    };
    acts.appendChild(btnCopy);
    modal.appendChild(acts);

    document.body.appendChild(modal);

    var cbtn = document.getElementById("ais-cbtn");
    if (cbtn) cbtn.onclick = closeAll;
  } catch(err) {
    alert("이미지 추출 오류: " + (err ? err.message : "알 수 없는 오류"));
  }
})`
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');

  return 'javascript:' + scriptBody + '(' + serializedAppUrl + ');';
}
