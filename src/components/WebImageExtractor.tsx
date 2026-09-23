import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Search,
  Download,
  Archive,
  Check,
  CheckSquare,
  Square,
  ExternalLink,
  Filter,
  Eye,
  ArrowRight,
  Sparkles,
  Zap,
  Copy,
  RefreshCw,
  AlertCircle,
  ImageIcon,
  X,
  Layers,
  FileCheck,
  ShieldCheck,
  SlidersHorizontal,
  Bookmark,
  Code,
  ListPlus,
  HelpCircle,
  MousePointerClick,
  ShoppingBag,
} from 'lucide-react';
import { ExtractedImageItem, ExtractionResult } from '../types';
import {
  extractImagesFromUrl,
  parseImagesFromHtmlClient,
  parseImagesFromRawText,
  fetchImageBlob,
  downloadExtractedImagesAsZip,
  blobToFile,
  generateBookmarkletCode,
  detectMallType,
} from '../utils/imageExtractor';
import { downloadBlob } from '../utils/imageProcessor';

interface WebImageExtractorProps {
  onSendToOptimizer?: (files: File[]) => void;
  onSendToThumbnail?: (imageUrl: string) => void;
}

type ExtractorMode = 'url' | 'bookmarklet' | 'html' | 'list';

const SAMPLE_URLS = [
  { label: 'Unsplash 블로그', url: 'https://unsplash.com/blog' },
  { label: '위키백과 (사진술)', url: 'https://ko.wikipedia.org/wiki/%EC%82%AC%EC%A7%84%EC%88%A0' },
  { label: 'GitHub 블로그', url: 'https://github.blog' },
];

export function WebImageExtractor({
  onSendToOptimizer,
  onSendToThumbnail,
}: WebImageExtractorProps) {
  // Mode tabs
  const [mode, setMode] = useState<ExtractorMode>('url');

  // Input states
  const [inputUrl, setInputUrl] = useState('');
  const [inputHtml, setInputHtml] = useState('');
  const [inputList, setInputList] = useState('');

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blockedMallInfo, setBlockedMallInfo] = useState<{ siteName: string; pageUrl: string } | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedMall, setSelectedMall] = useState<string>('all');
  const [hideSmallImages, setHideSmallImages] = useState<boolean>(true);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Image natural dimensions cache
  const [imageDims, setImageDims] = useState<Record<string, { width: number; height: number }>>({});

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<ExtractedImageItem | null>(null);

  // Download / Export states
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [exportingToOptimizer, setExportingToOptimizer] = useState(false);

  // Bookmarklet Code
  const appUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = new URL(window.location.href);
        return `${u.protocol}//${u.host}${u.pathname}`;
      } catch {
        return window.location.origin || '';
      }
    }
    return '';
  }, []);

  const bookmarkletCode = useMemo(() => {
    return generateBookmarkletCode(appUrl);
  }, [appUrl]);

  // Listen for Bookmarklet or PostMessage data transfer
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'AIS_IMAGES_TRANSFER' && event.data.payload) {
        const { title, pageUrl, images: rawList } = event.data.payload;
        if (Array.isArray(rawList) && rawList.length > 0) {
          const parsed = parseImagesFromRawText(rawList.join('\n'));
          parsed.pageTitle = title || '쇼핑몰 수집 이미지';
          parsed.pageUrl = pageUrl || '';
          setResult(parsed);
          setSuccessToast(`🎉 ${title || '웹페이지'}에서 이미지 ${parsed.totalCount}개를 브라우저에서 직접 수집했습니다!`);
          setTimeout(() => setSuccessToast(null), 5000);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // If opened via bookmarklet, signal opener window that we are ready
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage({ type: 'AIS_EXTRACTOR_READY' }, '*');
      } catch {
        // ignore
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Handle URL Extract
  const handleExtractUrl = async (overrideUrl?: string) => {
    const target = (overrideUrl || inputUrl).trim();
    if (!target) {
      setErrorMsg('웹페이지 주소(URL)를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setBlockedMallInfo(null);
    setImageDims({});

    try {
      const data = await extractImagesFromUrl(target);
      if (data.isProtectedShoppingSite) {
        setBlockedMallInfo({
          siteName: data.siteName || '웹페이지',
          pageUrl: target,
        });
        setErrorMsg(data.error || '보안 방화벽으로 인해 직접 서버 접속이 차단되었습니다.');
      } else if (!data.images || data.images.length === 0) {
        setErrorMsg('해당 페이지에서 감지된 이미지가 없습니다. (보안 차단 또는 자바스크립트 렌더링 페이지)');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setBlockedMallInfo({ siteName: '보안 보호 웹페이지', pageUrl: target });
      setErrorMsg(err.message || '이미지를 추출하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle HTML Paste Extract
  const handleExtractHtml = () => {
    const html = inputHtml.trim();
    if (!html) {
      setErrorMsg('HTML 소스 코드를 붙여넣어 주세요. (Ctrl+U로 페이지 소스 복사)');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = parseImagesFromHtmlClient(html, 'https://shopping-mall-source.com');
      if (data.images.length === 0) {
        setErrorMsg('붙여넣은 HTML에서 유효한 이미지 주소를 찾지 못했습니다.');
      } else {
        setResult(data);
        setSuccessToast(`성공: HTML 소스에서 이미지 ${data.totalCount}개를 추출했습니다.`);
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'HTML 분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle URL List Extract
  const handleExtractList = () => {
    const text = inputList.trim();
    if (!text) {
      setErrorMsg('이미지 URL 주소들을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = parseImagesFromRawText(text);
      if (data.images.length === 0) {
        setErrorMsg('입력된 내용에서 이미지 URL을 찾지 못했습니다.');
      } else {
        setResult(data);
        setSuccessToast(`성공: 이미지 목록 ${data.totalCount}개를 불러왔습니다.`);
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '이미지 목록 분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (!result) return;
    setResult({
      ...result,
      images: result.images.map((img) =>
        img.id === id ? { ...img, selected: !img.selected } : img
      ),
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (!result) return;
    setResult({
      ...result,
      images: result.images.map((img) => ({ ...img, selected: select })),
    });
  };

  // Filtered list
  const filteredImages = useMemo(() => {
    if (!result) return [];
    return result.images.filter((img) => {
      // Format filter
      if (selectedFormat !== 'all') {
        if (selectedFormat === 'jpg' && !['jpg', 'jpeg'].includes(img.format.toLowerCase())) {
          return false;
        } else if (selectedFormat !== 'jpg' && img.format.toLowerCase() !== selectedFormat) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== 'all' && img.type !== selectedType) {
        return false;
      }

      // Quality Filter (highres vs all)
      if (selectedMall === 'highres' && !img.isHighRes) {
        return false;
      }
      if (selectedMall === 'general' && img.isHighRes) {
        return false;
      }

      // Hide small images (< 60px if dimensions already loaded)
      if (hideSmallImages) {
        const dims = imageDims[img.id];
        if (dims && (dims.width < 60 || dims.height < 60)) {
          return false;
        }
        if (img.url.includes('1x1') || img.url.includes('spacer') || img.url.includes('tracker')) {
          return false;
        }
      }

      // Search keyword (alt or url)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchAlt = img.alt.toLowerCase().includes(kw);
        const matchUrl = img.url.toLowerCase().includes(kw);
        if (!matchAlt && !matchUrl) return false;
      }

      return true;
    });
  }, [result, selectedFormat, selectedType, selectedMall, hideSmallImages, searchKeyword, imageDims]);

  const selectedCount = useMemo(() => {
    return filteredImages.filter((img) => img.selected).length;
  }, [filteredImages]);

  // Single Image Download
  const handleDownloadSingle = async (img: ExtractedImageItem) => {
    try {
      const blob = await fetchImageBlob(img.url);
      let ext = img.format || 'jpg';
      if (ext === 'image') ext = blob.type.split('/')[1] || 'jpg';
      const cleanName = `${img.alt ? img.alt.slice(0, 20).replace(/[^a-zA-Z0-9가-힣_-]/g, '_') : 'image'}_${Date.now()}.${ext}`;
      downloadBlob(blob, cleanName);
    } catch (err: any) {
      alert(`이미지 다운로드 실패: ${err.message}`);
    }
  };

  // Download Selected as ZIP
  const handleDownloadZip = async (onlySelected = true) => {
    if (!result) return;
    const targetImages = onlySelected
      ? filteredImages.filter((img) => img.selected)
      : filteredImages;

    if (targetImages.length === 0) {
      alert('다운로드할 이미지를 1개 이상 선택해주세요.');
      return;
    }

    setIsZipping(true);
    setZipProgress(`이미지 ${targetImages.length}개 다운로드 및 압축 준비 중...`);

    try {
      const cleanTitle = result.pageTitle
        ? result.pageTitle.slice(0, 25).replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
        : 'web_images';
      await downloadExtractedImagesAsZip(targetImages, `${cleanTitle}_images`);
      setZipProgress('다운로드 완료!');
      setTimeout(() => setZipProgress(''), 3000);
    } catch (err: any) {
      alert(`ZIP 압축 다운로드 실패: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  // Send selected to Image Optimizer
  const handleSendToOptimizer = async () => {
    if (!result || !onSendToOptimizer) return;
    const targetImages = filteredImages.filter((img) => img.selected);
    if (targetImages.length === 0) {
      alert('최적화기로 보낼 이미지를 선택해주세요.');
      return;
    }

    setExportingToOptimizer(true);
    try {
      const files: File[] = [];
      for (let i = 0; i < targetImages.length; i++) {
        const item = targetImages[i];
        try {
          const blob = await fetchImageBlob(item.url);
          let ext = item.format || 'jpg';
          if (ext === 'image') ext = blob.type.split('/')[1] || 'jpg';
          const pad = String(i + 1).padStart(2, '0');
          const file = blobToFile(blob, `extracted_${pad}.${ext}`);
          files.push(file);
        } catch (e) {
          console.warn('Failed to load image for optimizer:', item.url, e);
        }
      }

      if (files.length > 0) {
        onSendToOptimizer(files);
      } else {
        alert('이미지를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      alert(`최적화기 전송 실패: ${err.message}`);
    } finally {
      setExportingToOptimizer(false);
    }
  };

  // Copy Image URL to clipboard
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(url);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  // Copy Bookmarklet Code
  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode).then(() => {
      alert('북마크릿 코드가 복사되었습니다! 브라우저 북마크를 생성한 후 URL 주소창에 붙여넣으세요.');
    });
  };

  return (
    <div className="space-y-6">
      {/* Intro Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-black text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-zinc-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>웹페이지 고화질 이미지 일괄 추출</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              이미지 추출기
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              웹페이지나 블로그, 상세페이지에 포함된 모든 이미지를 고화질 원본으로 추출하고 ZIP 파일로 일괄 다운로드할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-700/60">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>고화질 원본 복원 & 안티 핫링크 프록시 탑재</span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-1.5 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'url'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>URL 웹 주소 입력</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('bookmarklet')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'bookmarklet'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ 1초 북마크릿 (원클릭 추출)</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[10px] font-black">추천</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('html')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'html'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-blue-400" />
            <span>HTML 소스 직접 분석 (Ctrl+U 복사)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('list')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'list'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5 text-purple-400" />
            <span>이미지 링크 목록 일괄 입력</span>
          </button>
        </div>

        {/* Tab 1: URL Mode */}
        {mode === 'url' && (
          <div className="mt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExtractUrl();
              }}
              className="flex flex-col sm:flex-row items-stretch gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-700/80 shadow-inner"
            >
              <div className="relative flex-1 flex items-center min-w-0">
                <Globe className="w-5 h-5 text-zinc-400 ml-3 shrink-0" />
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https:// 사이트 주소 또는 블로그 글 링크를 입력하세요"
                  className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
                {inputUrl && (
                  <button
                    type="button"
                    onClick={() => setInputUrl('')}
                    className="p-1 text-zinc-400 hover:text-white mr-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setInputUrl(text);
                        handleExtractUrl(text);
                      }
                    } catch {
                      // Clipboard permissions denied
                    }
                  }}
                  className="px-3 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors shrink-0"
                  title="클립보드에서 붙여넣고 바로 추출"
                >
                  붙여넣기
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !inputUrl.trim()}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-bold shadow-md transition-all shrink-0 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>추출 중...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>이미지 추출</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick sample links */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="text-zinc-500">빠른 테스트:</span>
              {SAMPLE_URLS.map((sample) => (
                <button
                  key={sample.url}
                  type="button"
                  onClick={() => {
                    setInputUrl(sample.url);
                    handleExtractUrl(sample.url);
                  }}
                  className="px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/50"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Bookmarklet Mode (Chrome Extension alternative) */}
        {mode === 'bookmarklet' && (
          <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-emerald-500/40 text-xs text-zinc-300 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-bold text-[11px]">
                    확장프로그램 설치 불필요
                  </span>
                  <span className="font-bold text-white text-sm">
                    크롬 확장프로그램과 100% 동일한 브라우저 직접 수집 기술
                  </span>
                </div>
                <p className="text-zinc-400 text-xs">
                  외부 봇 접근을 제한하는 웹페이지도 사용자가 보고 있는 브라우저 화면에서
                  직접 고화질 이미지를 즉시 수집하여 본 화면으로 전송합니다.
                </p>
              </div>
            </div>

            {/* Step-by-step Bookmarklet drag & drop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-emerald-400 font-bold block">1단계: 북마크바에 등록</span>
                  <p className="text-zinc-400 text-[11px]">
                    아래 버튼을 마우스로 끌어서 브라우저 상단 <strong>북마크바</strong>(Ctrl+Shift+B)에 놓으세요.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  {/* Draggable bookmarklet link */}
                  <a
                    href={bookmarkletCode}
                    onClick={(e) => {
                      e.preventDefault();
                      // Allow direct in-tab testing if clicked!
                      try {
                        const script = bookmarkletCode.replace('javascript:', '');
                        new Function(script)();
                      } catch (err: any) {
                        alert('테스트 실행: ' + err.message);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg cursor-grab active:cursor-grabbing border border-emerald-400"
                    title="북마크바로 드래그하거나, 클릭해서 현재 화면에서 바로 테스트하세요"
                  >
                    <Bookmark className="w-4 h-4 fill-white" />
                    <span>⚡ 이미지 일괄 추출기 (드래그)</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyBookmarklet}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold"
                    title="코드 수동 복사"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>코드 복사</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                <span className="text-emerald-400 font-bold block">2단계: 해당 웹페이지에서 클릭</span>
                <p className="text-zinc-400 text-[11px]">
                  추출하려는 웹페이지에서 <strong>스크롤을 살짝 내린 후</strong> 북마크를 클릭하세요.
                </p>
                <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <MousePointerClick className="w-3.5 h-3.5" />
                    <span>화면 우측 하단 플로팅 창 표시</span>
                  </div>
                  <p className="text-zinc-400 text-[10px] leading-relaxed">
                    페이지 위에 고화질 사진 미리보기와 [최적화기 전송] 버튼이 즉시 나타납니다.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <span className="text-emerald-400 font-bold block">3단계: 자동 수신 & ZIP 다운로드</span>
                <p className="text-zinc-400 text-[11px]">
                  스튜디오 고화질 원본으로 변환된 모든 사진이 즉시 전송되며 한 번에 압축 저장됩니다.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                  <Check className="w-3.5 h-3.5" />
                  <span>실시간 데이터 수신 대기 중</span>
                </div>

                <div className="pt-1 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setMode('html')}
                    className="w-full text-left text-[11px] text-amber-400 hover:text-amber-300 font-medium hover:underline flex items-center gap-1"
                  >
                    <span>💡 북마크가 번거로우시면? [HTML 소스 복사] 탭 이용 ➔</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Troubleshooting Alert Box */}
            <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>북마크를 눌러도 반응이 없는 경우 해결 방법:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-300 pl-1">
                <li>
                  <strong>북마크 URL 확인:</strong> 북마크 등록 시 <code className="text-amber-300">javascript:</code> 접두사가 빠지지 않았는지 확인하세요. (<button type="button" onClick={handleCopyBookmarklet} className="underline text-emerald-400 font-bold">코드 복사</button> 후 북마크 주소에 붙여넣기 추천)
                </li>
                <li>
                  <strong>스크롤 로딩:</strong> 페이지 스크롤을 살짝 내려 상세 이미지가 화면에 로드된 후 북마크를 누르면 모든 고화질 컷이 완벽하게 추출됩니다.
                </li>
                <li>
                  <strong>가장 확실하고 빠른 방법:</strong> 해당 웹페이지에서 <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-white">Ctrl + U</kbd> 누르고 전체 복사(<kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-white">Ctrl+A</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-white">Ctrl+C</kbd>)하여 <strong>[HTML 소스 직접 분석]</strong> 탭에 넣으시면 <strong>100% 즉시 추출</strong>됩니다!
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: HTML Source Paste Mode */}
        {mode === 'html' && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>추출할 웹페이지에서 <strong>Ctrl+U</strong> (소스 보기) 후 전체 복사(Ctrl+A, Ctrl+C)하여 붙여넣으세요:</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setInputHtml(text);
                  } catch {
                    // ignore
                  }
                }}
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>클립보드 붙여넣기</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={inputHtml}
              onChange={(e) => setInputHtml(e.target.value)}
              placeholder="<html>... 또는 상품 페이지 소스 코드를 여기에 붙여넣으세요..."
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl p-3 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isLoading || !inputHtml.trim()}
                onClick={handleExtractHtml}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Code className="w-4 h-4" />
                <span>HTML 소스에서 이미지 즉시 추출</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Direct URL List Mode */}
        {mode === 'list' && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>여러 개의 이미지 URL 주소를 한 줄에 하나씩 입력하거나 복사한 텍스트를 붙여넣으세요:</span>
            </div>
            <textarea
              rows={4}
              value={inputList}
              onChange={(e) => setInputList(e.target.value)}
              placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png&#10;https://ae01.alicdn.com/kf/...jpg"
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl p-3 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isLoading || !inputList.trim()}
                onClick={handleExtractList}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <ListPlus className="w-4 h-4" />
                <span>이미지 목록 불러오기</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Smart Guided Banner for bot blocks */}
      {blockedMallInfo && (
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-3 animate-in fade-in shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-amber-900">
                  보안 보호(방화벽) 웹페이지 감지됨
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                  브라우저 직접 수집 지원
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                해당 웹페이지는 외부 서버의 자동화 수집을 제한하고 있습니다. 아래 2가지 방법 중 하나를 이용하시면 <strong>100% 정상 추출</strong>됩니다!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setMode('bookmarklet')}
              className="p-3 rounded-xl bg-white hover:bg-amber-100/50 border border-amber-300 text-left space-y-1 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-emerald-600" />
                  <span>방법 1: ⚡ 1초 북마크릿으로 즉시 추출 (가장 편리)</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-amber-800">
                북마크바에 마법사 버튼을 드래그해두고, 해당 웹페이지에서 클릭하면 1초 만에 완료!
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('html')}
              className="p-3 rounded-xl bg-white hover:bg-amber-100/50 border border-amber-300 text-left space-y-1 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-blue-600" />
                  <span>방법 2: 소스 복사 후 직접 붙여넣기 (Ctrl+U)</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-amber-800">
                해당 페이지에서 Ctrl+U 소스 보기 후 복사(Ctrl+A, Ctrl+C)하여 붙여넣으면 즉시 추출!
              </p>
            </button>
          </div>
        </div>
      )}

      {/* General Error Message */}
      {errorMsg && !blockedMallInfo && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-bold">이미지 추출에 실패했습니다</p>
            <p className="text-xs text-rose-700">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Extracted Content Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Target Website Card & Bulk Action Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Website Metadata */}
            <div className="flex items-center gap-3 min-w-0">
              {result.favicon ? (
                <img
                  src={result.favicon}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-8 h-8 rounded-lg object-contain border border-zinc-200 p-1 bg-zinc-50 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4 text-zinc-500" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-zinc-900 truncate">
                    {result.pageTitle || '수집된 상품 이미지'}
                  </h3>
                  {result.pageUrl && (
                    <a
                      href={result.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-400 hover:text-zinc-700 transition-colors"
                      title="새 창에서 원본 페이지 열기"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <span className="font-semibold text-emerald-600">
                    총 {result.totalCount}개 이미지 발견
                  </span>
                  <span>•</span>
                  <span>현재 {filteredImages.length}개 표시 중</span>
                </div>
              </div>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleSelectAll(selectedCount !== filteredImages.length)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors"
              >
                {selectedCount === filteredImages.length && filteredImages.length > 0 ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>전체 해제</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-zinc-400" />
                    <span>전체 선택</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isZipping || selectedCount === 0}
                onClick={() => handleDownloadZip(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>선택 {selectedCount}개 다운로드 (ZIP)</span>
              </button>

              {onSendToOptimizer && (
                <button
                  type="button"
                  disabled={exportingToOptimizer || selectedCount === 0}
                  onClick={handleSendToOptimizer}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  title="선택한 이미지를 이미지 일괄 최적화 탭으로 불러옵니다"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>최적화기로 보내기 ({selectedCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl p-3 border border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Mall Filter */}
              <div className="flex items-center gap-1">
                <span className="text-zinc-400 font-medium">화질:</span>
                <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                  {[
                    { id: 'all', label: '전체' },
                    { id: 'highres', label: '고화질 원본' },
                    { id: 'general', label: '일반' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMall(m.id)}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                        selectedMall === m.id
                          ? 'bg-white text-black shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Filter */}
              <div className="flex items-center gap-1">
                <span className="text-zinc-400 font-medium">포맷:</span>
                <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                  {['all', 'jpg', 'png', 'webp'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setSelectedFormat(fmt)}
                      className={`px-2 py-1 rounded text-xs font-semibold uppercase transition-colors ${
                        selectedFormat === fmt
                          ? 'bg-white text-black shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      {fmt === 'all' ? '전체' : fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hide Tiny Icons Toggle */}
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-zinc-600 select-none">
                <input
                  type="checkbox"
                  checked={hideSmallImages}
                  onChange={(e) => setHideSmallImages(e.target.checked)}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>초소형 아이콘/픽셀 제외</span>
              </label>
            </div>

            {/* Search within images */}
            <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200 w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="파일명 / 설명 검색"
                className="w-full bg-transparent border-none text-xs focus:outline-none placeholder-zinc-400"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Progress or status toast */}
          {zipProgress && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{zipProgress}</span>
            </div>
          )}

          {/* Images Grid */}
          {filteredImages.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-zinc-200 text-zinc-500">
              <ImageIcon className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">필터 조건에 맞는 이미지가 없습니다.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedFormat('all');
                  setSelectedType('all');
                  setSelectedMall('all');
                  setHideSmallImages(false);
                  setSearchKeyword('');
                }}
                className="mt-3 text-xs text-emerald-600 hover:underline font-bold"
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {filteredImages.map((img) => {
                const dims = imageDims[img.id];
                const isSelected = Boolean(img.selected);

                return (
                  <div
                    key={img.id}
                    onClick={() => handleToggleSelect(img.id)}
                    className={`group relative bg-white rounded-xl border transition-all overflow-hidden flex flex-col cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Checkbox badge top-left */}
                    <div className="absolute top-2 left-2 z-10">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-black/40 text-white/80 backdrop-blur-xs group-hover:bg-black/60'
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                      </div>
                    </div>

                    {/* Badges top-right */}
                    <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        {img.isHighRes && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white shadow-xs">
                            고화질 원본
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-black/75 text-white backdrop-blur-xs">
                          {img.format}
                        </span>
                      </div>
                    </div>

                    {/* Image Preview Container with no-referrer policy */}
                    <div className="relative aspect-square w-full bg-zinc-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={img.previewUrl || img.url}
                        alt={img.alt || '추출 이미지'}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onLoad={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.naturalWidth && target.naturalHeight) {
                            setImageDims((prev) => ({
                              ...prev,
                              [img.id]: {
                                width: target.naturalWidth,
                                height: target.naturalHeight,
                              },
                            }));
                          }
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== img.url) {
                            target.src = img.url;
                          }
                        }}
                        className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                      />

                      {/* Hover Action Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(img);
                          }}
                          className="p-2 rounded-xl bg-white/90 text-black hover:bg-white shadow-lg pointer-events-auto transition-transform hover:scale-110"
                          title="원본 크게 보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSingle(img);
                          }}
                          className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg pointer-events-auto transition-transform hover:scale-110"
                          title="이 이미지 즉시 다운로드"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="p-2.5 bg-white flex flex-col justify-between gap-1 flex-1 border-t border-zinc-100">
                      <p
                        className="text-xs text-zinc-800 font-medium truncate"
                        title={img.alt || img.url}
                      >
                        {img.alt || img.url.split('/').pop()?.split('?')[0] || '이미지'}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                        <span>
                          {dims ? `${dims.width}×${dims.height}` : '크기 확인 중...'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyUrl(img.url);
                          }}
                          className="text-zinc-400 hover:text-zinc-700 p-0.5"
                          title="이미지 URL 주소 복사"
                        >
                          {copyFeedback === img.url ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty State before search */}
      {!result && !isLoading && !errorMsg && (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-zinc-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto border border-zinc-200">
            <ShoppingBag className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="font-bold text-base text-zinc-900">
              추출할 웹페이지 링크 또는 소스를 입력해주세요
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              블로그는 물론 다양한 웹페이지와 상세페이지의 모든 이미지를 원본 고화질로 수집하여 ZIP으로 한 번에 내려받을 수 있습니다.
            </p>
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-emerald-600 font-bold text-xs block">01. 일반 웹페이지 & 블로그</span>
              <p className="text-[11px] text-zinc-500">
                URL 주소만 입력하면 본문 및 대표 썸네일(og:image)을 자동으로 크롤링합니다.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-emerald-600 font-bold text-xs block">02. 보안 보호 웹페이지</span>
              <p className="text-[11px] text-zinc-500">
                <strong>[⚡ 1초 북마크릿]</strong> 또는 <strong>[HTML 소스 직접 분석]</strong>으로 보안 제한 없이 100% 수집합니다.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-emerald-600 font-bold text-xs block">03. 고화질 복원 & ZIP 압축</span>
              <p className="text-[11px] text-zinc-500">
                저화질 썸네일 주소를 스튜디오 원본 고화질로 자동 승격하여 ZIP으로 묶어 저장합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-xs sm:text-sm truncate">
                  {lightboxImage.alt || '이미지 미리보기'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono uppercase">
                  {lightboxImage.format}
                </span>
                {lightboxImage.isHighRes && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold">
                    고화질 원본
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(lightboxImage)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="flex-1 bg-black p-4 flex items-center justify-center overflow-auto min-h-[300px]">
              <img
                src={lightboxImage.previewUrl || lightboxImage.url}
                alt={lightboxImage.alt}
                referrerPolicy="no-referrer"
                className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Footer with URL */}
            <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 gap-2">
              <span className="font-mono truncate">{lightboxImage.url}</span>
              <button
                type="button"
                onClick={() => handleCopyUrl(lightboxImage.url)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>주소 복사</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
