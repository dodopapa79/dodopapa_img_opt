import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ExtractedImageRaw {
  url: string;
  originalUrl?: string;
  alt: string;
  type: 'og:image' | 'img' | 'background' | 'picture' | 'link' | 'product' | 'detail';
  format: string;
  sourceMall?: 'coupang' | 'naver' | 'aliexpress' | 'general';
}

function detectFormat(url: string): string {
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

function detectMall(url: string): 'coupang' | 'naver' | 'aliexpress' | 'general' {
  const low = url.toLowerCase();
  if (low.includes('coupang.com') || low.includes('coupangcdn.com')) return 'coupang';
  if (low.includes('naver.com') || low.includes('pstatic.net')) return 'naver';
  if (low.includes('aliexpress.com') || low.includes('alicdn.com')) return 'aliexpress';
  return 'general';
}

/**
 * Automatically upgrades thumbnails to high-resolution studio originals for shopping malls
 */
function upgradeToHighResolutionUrl(url: string): string {
  try {
    let upgraded = url;

    // 1. Coupang thumbnails: /thumbnails/remote/230x230ex/image/... -> remove size constraint
    if (upgraded.includes('coupangcdn.com')) {
      upgraded = upgraded.replace(/\/thumbnails\/remote\/\d+x\d+ex\//, '/');
      upgraded = upgraded.replace(/\/thumbnails\/remote\/q\d+\//, '/');
      upgraded = upgraded.replace(/\?q=\d+$/, '');
    }

    // 2. Naver Shopping & SmartStore: ?type=f640 or ?type=m510 -> ?type=o (original)
    if (upgraded.includes('pstatic.net')) {
      if (upgraded.includes('?type=')) {
        upgraded = upgraded.replace(/\?type=[a-zA-Z0-9_-]+/, '?type=o');
      }
    }

    // 3. AliExpress: _220x220.jpg or _Q90.jpg_.webp -> strip resize suffixes
    if (upgraded.includes('alicdn.com')) {
      upgraded = upgraded.replace(/_\d+x\d+\.(?:jpg|png|webp)/g, '');
      upgraded = upgraded.replace(/_\.(?:webp|jpg)$/g, '');
      upgraded = upgraded.replace(/_Q\d+\.jpg$/g, '');
      upgraded = upgraded.replace(/_\d+x\d+Q\d+\.jpg$/g, '');
    }

    // 4. 11st: /t/300/ -> /t/original/
    if (upgraded.includes('011st.com')) {
      upgraded = upgraded.replace(/\/t\/\d+\//, '/t/original/');
    }

    return upgraded;
  } catch {
    return url;
  }
}

function normalizeUrl(candidate: string, baseUrl: string): string | null {
  try {
    const trimmed = candidate.trim().replace(/^['"]|['"]$/g, '');
    if (!trimmed || trimmed.startsWith('javascript:') || trimmed.startsWith('mailto:')) {
      return null;
    }
    // Allow data URLs only if they are image data
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

export function extractImagesFromHtml(html: string, pageUrl: string) {
  const images: ExtractedImageRaw[] = [];
  const seenUrls = new Set<string>();

  const addImage = (
    rawUrl: string,
    alt: string,
    type: ExtractedImageRaw['type'],
    sourceMall?: ExtractedImageRaw['sourceMall']
  ) => {
    const normalized = normalizeUrl(rawUrl, pageUrl);
    if (!normalized) return;

    // Filter obvious trackers and transparent pixels
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
    const targetUrl = highRes || normalized;

    if (seenUrls.has(targetUrl)) return;
    seenUrls.add(targetUrl);

    images.push({
      url: targetUrl,
      originalUrl: highRes !== normalized ? normalized : undefined,
      alt: alt ? alt.trim() : '',
      type,
      format: detectFormat(targetUrl),
      sourceMall: sourceMall || detectMall(targetUrl),
    });
  };

  // 1. Page Title
  let pageTitle = '';
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    pageTitle = titleMatch[1].replace(/[\r\n\t]+/g, ' ').trim();
  }

  // 2. Favicon
  let favicon = '';
  const faviconMatch =
    html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
  if (faviconMatch && faviconMatch[1]) {
    favicon = normalizeUrl(faviconMatch[1], pageUrl) || '';
  } else {
    try {
      const u = new URL(pageUrl);
      favicon = `${u.protocol}//${u.host}/favicon.ico`;
    } catch {
      // ignore
    }
  }

  // 3. OpenGraph & Twitter Social Share Images
  const ogMatches = html.matchAll(
    /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/gi
  );
  for (const m of ogMatches) {
    if (m[1]) addImage(m[1], '대표 썸네일 (og:image)', 'og:image');
  }
  const ogReverseMatches = html.matchAll(
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image|twitter:image:src)["']/gi
  );
  for (const m of ogReverseMatches) {
    if (m[1]) addImage(m[1], '대표 썸네일 (og:image)', 'og:image');
  }

  // 4. <img> tags (including data-src, data-original, data-lazy-src, srcset)
  const imgTags = html.matchAll(/<img\b([^>]*)>/gi);
  for (const imgMatch of imgTags) {
    const attrs = imgMatch[1] || '';

    // Alt text
    const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : '';

    // Primary src
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      addImage(srcMatch[1], alt, 'img');
    }

    // Lazy load attributes commonly used in blogs/news/ecommerce (Coupang, Naver, AliExpress, etc.)
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
      const lazyRegex = new RegExp(`\\b${attr}=["']([^"']+)["']`, 'i');
      const lazyMatch = attrs.match(lazyRegex);
      if (lazyMatch && lazyMatch[1]) {
        addImage(lazyMatch[1], alt, 'img');
      }
    }

    // srcset (comma separated)
    const srcsetMatch = attrs.match(/\bsrcset=["']([^"']+)["']/i);
    if (srcsetMatch && srcsetMatch[1]) {
      const candidates = srcsetMatch[1].split(',');
      for (const cand of candidates) {
        const urlCandidate = cand.trim().split(/\s+/)[0];
        if (urlCandidate) addImage(urlCandidate, alt, 'img');
      }
    }
  }

  // 5. <picture> <source> tags
  const sourceTags = html.matchAll(/<source\b([^>]*)>/gi);
  for (const srcMatch of sourceTags) {
    const attrs = srcMatch[1] || '';
    const srcsetMatch = attrs.match(/\bsrcset=["']([^"']+)["']/i);
    if (srcsetMatch && srcsetMatch[1]) {
      const candidates = srcsetMatch[1].split(',');
      for (const cand of candidates) {
        const urlCandidate = cand.trim().split(/\s+/)[0];
        if (urlCandidate) addImage(urlCandidate, '', 'picture');
      }
    }
  }

  // 6. Inline CSS background-image: url(...)
  const bgMatches = html.matchAll(/background(?:-image)?\s*:\s*[^;}"']*url\(["']?([^"')]+)["']?\)/gi);
  for (const bgMatch of bgMatches) {
    if (bgMatch[1]) {
      addImage(bgMatch[1], '배경 이미지', 'background');
    }
  }

  // 7. <a> links pointing directly to images
  const aLinkMatches = html.matchAll(
    /<a\b[^>]*\bhref=["']([^"']+\.(?:jpg|jpeg|png|webp|gif|svg|avif)(?:\?[^"']*)?)["'][^>]*>/gi
  );
  for (const aMatch of aLinkMatches) {
    if (aMatch[1]) {
      addImage(aMatch[1], '링크 연결 이미지', 'link');
    }
  }

  // 8. E-commerce <script> JSON Deep Scan (Coupang, Naver Shopping, AliExpress, Musinsa, etc.)
  const scriptTags = html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
  for (const scriptMatch of scriptTags) {
    const scriptContent = scriptMatch[1] || '';
    if (!scriptContent || scriptContent.length < 20) continue;

    // Fast check if this script has image or CDN references
    if (
      scriptContent.includes('image') ||
      scriptContent.includes('cdn') ||
      scriptContent.includes('jpg') ||
      scriptContent.includes('png') ||
      scriptContent.includes('webp') ||
      scriptContent.includes('photo')
    ) {
      // Find all absolute image URLs inside JSON
      const jsonImgRegex = /https?:\\?\/\\?\/[a-zA-Z0-9_.~:/?#[\]@!$&'()*+,;=-]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[a-zA-Z0-9_.~:/?#[\]@!$&'()*+,;=-]*)?/gi;
      const matches = scriptContent.matchAll(jsonImgRegex);
      for (const m of matches) {
        let clean = m[0].replace(/\\\/|\\u002F/gi, '/').replace(/\\"/g, '').trim();
        // Skip tiny icons and script libraries
        if (!clean.includes('.js') && !clean.includes('font') && clean.length > 12) {
          addImage(clean, '상품 상세/옵션 이미지', 'product');
        }
      }
    }
  }

  return {
    pageTitle: pageTitle || new URL(pageUrl).hostname,
    pageUrl,
    favicon,
    images: images.map((img, idx) => ({
      id: `ext-img-${idx + 1}`,
      url: img.url,
      originalUrl: img.originalUrl,
      previewUrl: `/api/proxy-image?url=${encodeURIComponent(img.url)}`,
      alt: img.alt,
      format: img.format,
      type: img.type,
      sourceMall: img.sourceMall,
      selected: true, // Default selected
    })),
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // API 1: Extract Images from any URL
  app.post('/api/extract-images', async (req: Request, res: Response) => {
    let { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, error: '유효한 웹페이지 URL을 입력해주세요.' });
      return;
    }

    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const isCoupang = url.includes('coupang.com');
    const isNaver = url.includes('naver.com') || url.includes('smartstore.naver.com');
    const isAli = url.includes('aliexpress.com');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Desktop Chrome User-Agent with full modern headers
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Sec-Ch-Ua': '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      clearTimeout(timeoutId);

      // Detect WAF / Bot blocking / HTTP error on any protected webpage
      if (
        !response.ok ||
        (isNaver && response.url.includes('internal-error.html')) ||
        (isCoupang && response.status === 403)
      ) {
        if (response.status === 403 || response.status === 429 || response.status === 401 || isCoupang || isNaver || isAli) {
          res.json({
            success: false,
            isProtectedShoppingSite: true,
            siteName: '보안 방화벽 보호 웹페이지',
            pageUrl: url,
            error: '해당 웹페이지는 보안 방화벽으로 외부 서버의 직접 수집을 제한하고 있습니다. 브라우저에서 직접 수집하는 [⚡ 1초 북마크릿] 또는 [HTML 소스 직접 분석(Ctrl+U 복사)]을 이용하시면 모든 이미지를 정상 수집할 수 있습니다.',
          });
          return;
        }

        res.status(response.status).json({
          success: false,
          error: `웹페이지에 접속할 수 없습니다 (HTTP ${response.status}: ${response.statusText})`,
        });
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        if (contentType.startsWith('image/')) {
          const finalUrl = response.url || url;
          const format = detectFormat(finalUrl);
          res.json({
            success: true,
            pageTitle: '단일 이미지',
            pageUrl: finalUrl,
            images: [
              {
                id: 'ext-img-1',
                url: finalUrl,
                previewUrl: `/api/proxy-image?url=${encodeURIComponent(finalUrl)}`,
                alt: '단일 이미지',
                format,
                type: 'img',
                sourceMall: detectMall(finalUrl),
                selected: true,
              },
            ],
            totalCount: 1,
          });
          return;
        }
      }

      const html = await response.text();

      // Check if Coupang / Naver returned a maintenance or challenge block page
      if (
        (isCoupang && html.includes('AkamaiGHost')) ||
        (isNaver && html.includes('internal-error.html')) ||
        html.includes('punish?type=')
      ) {
        res.json({
          success: false,
          isProtectedShoppingSite: true,
          siteName: '보안 보호 웹페이지',
          pageUrl: url,
          error: '해당 웹페이지의 보안 시스템이 서버 요청을 차단했습니다. [⚡ 1초 북마크릿] 또는 [HTML 소스 직접 분석]을 이용해주세요!',
        });
        return;
      }

      const extracted = extractImagesFromHtml(html, response.url || url);

      res.json({
        success: true,
        pageTitle: extracted.pageTitle,
        pageUrl: extracted.pageUrl,
        favicon: extracted.favicon,
        images: extracted.images,
        totalCount: extracted.images.length,
      });
    } catch (err: any) {
      res.json({
        success: false,
        isProtectedShoppingSite: true,
        siteName: '보안 방화벽 보호 웹페이지',
        pageUrl: url,
        error: '해당 웹페이지는 보안 방화벽으로 서버 직접 접속이 차단되었습니다. [⚡ 1초 북마크릿] 또는 [HTML 소스 직접 분석] 탭을 이용하시면 즉시 100% 정상 추출됩니다!',
      });
    }
  });

  // API 2: Parse Raw HTML directly (pasted by user or bookmarklet)
  app.post('/api/parse-html', (req: Request, res: Response) => {
    const { html, pageUrl = 'https://custom-page.com' } = req.body || {};
    if (!html || typeof html !== 'string') {
      res.status(400).json({ success: false, error: 'HTML 소스 코드를 입력해주세요.' });
      return;
    }

    try {
      const extracted = extractImagesFromHtml(html, pageUrl);
      res.json({
        success: true,
        pageTitle: extracted.pageTitle,
        pageUrl: extracted.pageUrl,
        favicon: extracted.favicon,
        images: extracted.images,
        totalCount: extracted.images.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'HTML 소스 분석 중 오류가 발생했습니다.' });
    }
  });

  // API 3: Smart Image Proxy with custom Referers (bypasses Hotlink Protection on Coupang, Naver, Ali)
  app.get('/api/proxy-image', async (req: Request, res: Response) => {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== 'string') {
      res.status(400).send('Missing url parameter');
      return;
    }

    try {
      const u = new URL(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      // Custom Referer according to CDN domain
      let referer = `${u.protocol}//${u.host}/`;
      const lowUrl = targetUrl.toLowerCase();
      if (lowUrl.includes('coupangcdn.com') || lowUrl.includes('coupang.com')) {
        referer = 'https://www.coupang.com/';
      } else if (lowUrl.includes('pstatic.net') || lowUrl.includes('naver.com')) {
        referer = 'https://smartstore.naver.com/';
      } else if (lowUrl.includes('alicdn.com') || lowUrl.includes('aliexpress.com')) {
        referer = 'https://www.aliexpress.com/';
      } else if (lowUrl.includes('011st.com') || lowUrl.includes('11st.co.kr')) {
        referer = 'https://www.11st.co.kr/';
      } else if (lowUrl.includes('gmarket.co.kr')) {
        referer = 'https://www.gmarket.co.kr/';
      }

      const imageResponse = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: referer,
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      clearTimeout(timeoutId);

      if (!imageResponse.ok) {
        res.status(imageResponse.status).send(`Failed to fetch image: ${imageResponse.statusText}`);
        return;
      }

      const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const arrayBuffer = await imageResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).send(`Image proxy error: ${err.message}`);
    }
  });

  // Serve Frontend: Dev with Vite middlewares, Prod with static dist
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
