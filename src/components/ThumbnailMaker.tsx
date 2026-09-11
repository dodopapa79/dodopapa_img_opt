import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Image as ImageIcon,
  Type,
  Palette,
  Sparkles,
  Download,
  Trash2,
  Plus,
  Move,
  RotateCcw,
  Check,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  Layers,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  ThumbnailRatio,
  ThumbnailBgType,
  ThumbnailTextLayer,
  OutputFormat,
} from '../types';
import { downloadBlob } from '../utils/imageProcessor';

const STORAGE_BG_IMAGE_KEY = 'blog_thumbnail_saved_bg_image_v2';

interface GradientPreset {
  id: string;
  name: string;
  css: string;
  colors: [string, string];
}

const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'modern-dark', name: '모던 다크', css: 'from-zinc-900 via-zinc-800 to-black', colors: ['#18181B', '#09090B'] },
  { id: 'sunset', name: '선셋 오렌지', css: 'from-amber-600 via-orange-600 to-rose-700', colors: ['#D97706', '#E11D48'] },
  { id: 'ocean', name: '딥 오션', css: 'from-blue-900 via-indigo-900 to-slate-950', colors: ['#1E3A8A', '#020617'] },
  { id: 'purple-night', name: '퍼플 나이트', css: 'from-purple-900 via-violet-900 to-zinc-950', colors: ['#581C87', '#09090B'] },
  { id: 'emerald-forest', name: '에메랄드', css: 'from-emerald-900 via-teal-900 to-black', colors: ['#064E3B', '#022C22'] },
  { id: 'rose-gold', name: '로즈 와인', css: 'from-rose-900 via-pink-950 to-zinc-950', colors: ['#881337', '#18181B'] },
  { id: 'clean-soft', name: '소프트 크림', css: 'from-zinc-100 via-stone-100 to-zinc-200', colors: ['#F4F4F5', '#E4E4E7'] },
  { id: 'cyber-neon', name: '사이버 블루', css: 'from-sky-900 via-cyan-950 to-black', colors: ['#0C4A6E', '#030712'] },
];

const SOLID_PRESETS = [
  { label: '다크 블랙', color: '#09090B' },
  { label: '차콜 그레이', color: '#18181B' },
  { label: '미드나잇 블루', color: '#0F172A' },
  { label: '딥 에메랄드', color: '#064E3B' },
  { label: '버건디', color: '#4C0519' },
  { label: '초콜릿 브라운', color: '#3E2723' },
  { label: '소프트 화이트', color: '#FAFAFA' },
  { label: '크림 아이보리', color: '#FDFBF7' },
];

interface StylePreset {
  id: string;
  name: string;
  description: string;
  texts: (ratio: ThumbnailRatio, w: number, h: number) => ThumbnailTextLayer[];
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'center-focus',
    name: '중앙 집중 대형 타이틀',
    description: '가독성이 가장 뛰어난 블로그 메인 썸네일',
    texts: (_ratio, w, h) => [
      {
        id: 't-cat',
        text: 'BLOG CATEGORY',
        x: Math.round(w / 2),
        y: Math.round(h * 0.36),
        fontSize: Math.round(w * 0.038),
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontWeight: 'bold',
        color: '#FACC15',
        align: 'center',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 4,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.85)',
        shadowBlur: 8,
        hasBadgeBg: true,
        badgeBgColor: 'rgba(0,0,0,0.65)',
        badgePadding: 16,
        badgeRadius: 8,
      },
      {
        id: 't-main',
        text: '클릭을 부르는 핵심 제목',
        x: Math.round(w / 2),
        y: Math.round(h * 0.52),
        fontSize: Math.round(w * 0.075),
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontWeight: '900',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: true,
        strokeColor: '#000000',
        strokeWidth: 6,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 14,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 12,
        badgeRadius: 10,
      },
      {
        id: 't-sub',
        text: '상세 내용과 실전 팁 한눈에 정리',
        x: Math.round(w / 2),
        y: Math.round(h * 0.68),
        fontSize: Math.round(w * 0.042),
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontWeight: 'bold',
        color: '#E4E4E7',
        align: 'center',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 4,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 6,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 10,
        badgeRadius: 8,
      },
    ],
  },
  {
    id: 'left-magazine',
    name: '좌측 정렬 매거진 스타일',
    description: '세련된 감성의 카드뉴스 및 정보글 스타일',
    texts: (_ratio, w, h) => [
      {
        id: 't-cat',
        text: '실전 노하우 가이드',
        x: Math.round(w * 0.12),
        y: Math.round(h * 0.38),
        fontSize: Math.round(w * 0.038),
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontWeight: 'bold',
        color: '#60A5FA',
        align: 'left',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 4,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 6,
        hasBadgeBg: true,
        badgeBgColor: 'rgba(15,23,42,0.8)',
        badgePadding: 14,
        badgeRadius: 6,
      },
      {
        id: 't-main',
        text: '한 번에 마스터하는\n블로그 운영 비법',
        x: Math.round(w * 0.12),
        y: Math.round(h * 0.55),
        fontSize: Math.round(w * 0.072),
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontWeight: '900',
        color: '#FFFFFF',
        align: 'left',
        hasStroke: true,
        strokeColor: '#000000',
        strokeWidth: 5,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 12,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 12,
        badgeRadius: 8,
      },
    ],
  },
  {
    id: 'badge-highlight',
    name: '강조 배너 박스 스타일',
    description: '배경 사진과 완벽히 분리되는 확실한 시선 집중',
    texts: (_ratio, w, h) => [
      {
        id: 't-main',
        text: '🔥 2026 필독 공지사항',
        x: Math.round(w / 2),
        y: Math.round(h * 0.5),
        fontSize: Math.round(w * 0.068),
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontWeight: '900',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 4,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.7)',
        shadowBlur: 10,
        hasBadgeBg: true,
        badgeBgColor: '#EF4444',
        badgePadding: 24,
        badgeRadius: 16,
      },
      {
        id: 't-sub',
        text: '놓치면 후회하는 중요한 정보 업데이트',
        x: Math.round(w / 2),
        y: Math.round(h * 0.68),
        fontSize: Math.round(w * 0.04),
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontWeight: 'bold',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: true,
        strokeColor: '#000000',
        strokeWidth: 4,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 8,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 10,
        badgeRadius: 8,
      },
    ],
  },
];

export function ThumbnailMaker() {
  const [ratio, setRatio] = useState<ThumbnailRatio>('1:1');
  const [bgType, setBgType] = useState<ThumbnailBgType>('gradient');
  const [gradientId, setGradientId] = useState<string>('modern-dark');
  const [solidColor, setSolidColor] = useState<string>('#09090B');
  const [savedBgImage, setSavedBgImage] = useState<string | null>(null);
  const [dimOpacity, setDimOpacity] = useState<number>(0.35); // 0 to 0.8
  const [downloadFormat, setDownloadFormat] = useState<OutputFormat>('webp');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Canvas Dimensions based on ratio
  const getCanvasSize = (r: ThumbnailRatio) => {
    switch (r) {
      case '1:1':
        return { width: 1080, height: 1080 };
      case '16:9':
        return { width: 1280, height: 720 };
      case '4:3':
        return { width: 1200, height: 900 };
      default:
        return { width: 1080, height: 1080 };
    }
  };

  const canvasDims = getCanvasSize(ratio);

  // Text Layers
  const [texts, setTexts] = useState<ThumbnailTextLayer[]>(() =>
    STYLE_PRESETS[0].texts('1:1', 1080, 1080)
  );
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const selectedText = texts.find((t) => t.id === selectedTextId) || null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImgElementRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    startClientX: number;
    startClientY: number;
  } | null>(null);

  // Load saved background image from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BG_IMAGE_KEY);
      if (saved) {
        setSavedBgImage(saved);
        setBgType('image');
      }
    } catch (e) {
      console.warn('Failed to load saved thumbnail background from localStorage', e);
    }
  }, []);

  // Preload Image Element when savedBgImage changes
  useEffect(() => {
    if (savedBgImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        bgImgElementRef.current = img;
        renderCanvas();
      };
      img.src = savedBgImage;
    } else {
      bgImgElementRef.current = null;
      renderCanvas();
    }
  }, [savedBgImage]);

  // Handle uploading background image & persisting to localStorage
  const handleUploadBgImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSavedBgImage(result);
        setBgType('image');
        try {
          localStorage.setItem(STORAGE_BG_IMAGE_KEY, result);
        } catch (err) {
          console.warn('Storage quota exceeded or error saving image to localStorage', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove saved background image from localStorage
  const handleClearSavedBgImage = () => {
    setSavedBgImage(null);
    bgImgElementRef.current = null;
    try {
      localStorage.removeItem(STORAGE_BG_IMAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove thumbnail background from localStorage', e);
    }
    setBgType('gradient');
  };

  // Switch ratio & rescale text positions proportionally
  const handleRatioChange = (newRatio: ThumbnailRatio) => {
    const oldSize = getCanvasSize(ratio);
    const newSize = getCanvasSize(newRatio);
    setRatio(newRatio);

    const scaleX = newSize.width / oldSize.width;
    const scaleY = newSize.height / oldSize.height;

    setTexts((prev) =>
      prev.map((t) => ({
        ...t,
        x: Math.round(t.x * scaleX),
        y: Math.round(t.y * scaleY),
        fontSize: Math.round(t.fontSize * Math.min(scaleX, scaleY)),
      }))
    );
  };

  // Apply style preset
  const handleApplyPreset = (preset: StylePreset) => {
    const size = getCanvasSize(ratio);
    setTexts(preset.texts(ratio, size.width, size.height));
    setSelectedTextId(null);
  };

  // Add new text layer
  const handleAddTextLayer = () => {
    const size = getCanvasSize(ratio);
    const newLayer: ThumbnailTextLayer = {
      id: `text-${Date.now()}`,
      text: '새로운 텍스트 문구',
      x: Math.round(size.width / 2),
      y: Math.round(size.height * 0.5),
      fontSize: Math.round(size.width * 0.055),
      fontFamily: 'Pretendard, -apple-system, sans-serif',
      fontWeight: 'bold',
      color: '#FFFFFF',
      align: 'center',
      hasStroke: true,
      strokeColor: '#000000',
      strokeWidth: 4,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.85)',
      shadowBlur: 8,
      hasBadgeBg: false,
      badgeBgColor: 'rgba(0,0,0,0.5)',
      badgePadding: 12,
      badgeRadius: 8,
    };
    setTexts((prev) => [...prev, newLayer]);
    setSelectedTextId(newLayer.id);
  };

  // Update selected text layer
  const updateSelectedText = (patch: Partial<ThumbnailTextLayer>) => {
    if (!selectedTextId) return;
    setTexts((prev) =>
      prev.map((t) => (t.id === selectedTextId ? { ...t, ...patch } : t))
    );
  };

  // Delete selected text layer
  const handleDeleteSelectedText = () => {
    if (!selectedTextId) return;
    setTexts((prev) => prev.filter((t) => t.id !== selectedTextId));
    setSelectedTextId(null);
  };

  // -------------------------------------------------------------
  // Canvas Rendering Logic
  // -------------------------------------------------------------
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasDims;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background
    if (bgType === 'image' && bgImgElementRef.current) {
      const img = bgImgElementRef.current;
      // Cover scaling
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = width / height;
      let drawW = width;
      let drawH = height;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > canvasRatio) {
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
      } else {
        drawH = width / imgRatio;
        drawY = (height - drawH) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Dark Overlay (dim) to ensure text legibility
      if (dimOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${dimOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }
    } else if (bgType === 'solid') {
      ctx.fillStyle = solidColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Gradient background
      const preset = GRADIENT_PRESETS.find((g) => g.id === gradientId) || GRADIENT_PRESETS[0];
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, preset.colors[0]);
      grad.addColorStop(1, preset.colors[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw Text Layers
    texts.forEach((layer) => {
      if (!layer.text.trim()) return;

      ctx.save();
      ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
      ctx.textAlign = layer.align;
      ctx.textBaseline = 'middle';

      const lines = layer.text.split('\n');
      const lineHeight = layer.fontSize * 1.25;
      const totalTextHeight = lines.length * lineHeight;

      // Calculate bounding box for Badge background
      if (layer.hasBadgeBg) {
        let maxLineWidth = 0;
        lines.forEach((l) => {
          const w = ctx.measureText(l).width;
          if (w > maxLineWidth) maxLineWidth = w;
        });

        const padX = layer.badgePadding * 1.5;
        const padY = layer.badgePadding;
        const boxW = maxLineWidth + padX * 2;
        const boxH = totalTextHeight + padY * 2;

        let boxX = layer.x - boxW / 2;
        if (layer.align === 'left') boxX = layer.x - padX;
        if (layer.align === 'right') boxX = layer.x - boxW + padX;

        const boxY = layer.y - boxH / 2;

        ctx.fillStyle = layer.badgeBgColor;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxW, boxH, layer.badgeRadius);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
      }

      // Draw each line of text
      const startY = layer.y - (totalTextHeight / 2) + (lineHeight / 2);

      lines.forEach((line, idx) => {
        const lineY = startY + idx * lineHeight;

        // Shadow
        if (layer.hasShadow) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = Math.round(layer.shadowBlur * 0.25);
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        // Stroke (Border)
        if (layer.hasStroke && layer.strokeWidth > 0) {
          ctx.strokeStyle = layer.strokeColor;
          ctx.lineWidth = layer.strokeWidth;
          ctx.lineJoin = 'round';
          ctx.strokeText(line, layer.x, lineY);
        }

        // Fill Text
        ctx.fillStyle = layer.color;
        ctx.fillText(line, layer.x, lineY);
      });

      ctx.restore();
    });
  }, [canvasDims, bgType, gradientId, solidColor, dimOpacity, texts]);

  // Re-render whenever settings change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // -------------------------------------------------------------
  // Mouse Drag to Move Text Layer on Canvas
  // -------------------------------------------------------------
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasDims.width / rect.width;
    const scaleY = canvasDims.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check hit test against text layers (reverse order: top-most first)
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let hitId: string | null = null;
    for (let i = texts.length - 1; i >= 0; i--) {
      const layer = texts[i];
      ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
      const lines = layer.text.split('\n');
      let maxLineWidth = 0;
      lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > maxLineWidth) maxLineWidth = w;
      });
      const lineHeight = layer.fontSize * 1.25;
      const totalHeight = lines.length * lineHeight;

      const halfW = maxLineWidth / 2 + 20;
      const halfH = totalHeight / 2 + 15;

      let cx = layer.x;
      if (layer.align === 'left') cx = layer.x + halfW - 20;
      if (layer.align === 'right') cx = layer.x - halfW + 20;

      if (
        clickX >= cx - halfW &&
        clickX <= cx + halfW &&
        clickY >= layer.y - halfH &&
        clickY <= layer.y + halfH
      ) {
        hitId = layer.id;
        break;
      }
    }

    if (hitId) {
      setSelectedTextId(hitId);
      const targetLayer = texts.find((t) => t.id === hitId)!;
      dragRef.current = {
        id: hitId,
        startX: targetLayer.x,
        startY: targetLayer.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
      };
    } else {
      setSelectedTextId(null);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasDims.width / rect.width;
      const scaleY = canvasDims.height / rect.height;

      const deltaX = (e.clientX - dragRef.current.startClientX) * scaleX;
      const deltaY = (e.clientY - dragRef.current.startClientY) * scaleY;

      const newX = Math.round(dragRef.current.startX + deltaX);
      const newY = Math.round(dragRef.current.startY + deltaY);

      setTexts((prev) =>
        prev.map((t) =>
          t.id === dragRef.current?.id ? { ...t, x: newX, y: newY } : t
        )
      );
    };

    const handleMouseUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasDims]);

  // -------------------------------------------------------------
  // Export / Download High-Quality Thumbnail
  // -------------------------------------------------------------
  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);

    try {
      renderCanvas();
      const mimeType =
        downloadFormat === 'webp'
          ? 'image/webp'
          : downloadFormat === 'png'
          ? 'image/png'
          : 'image/jpeg';

      const quality = downloadFormat === 'png' ? undefined : 0.95;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const ratioName =
              ratio === '1:1' ? 'square' : ratio === '16:9' ? 'wide' : 'classic';
            const filename = `blog-thumbnail-${ratioName}-${Date.now()}.${downloadFormat}`;
            downloadBlob(blob, filename);
          }
          setIsExporting(false);
        },
        mimeType,
        quality
      );
    } catch (e) {
      console.error('Failed to export thumbnail', e);
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm overflow-hidden mb-8">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>블로그 썸네일 제작기</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                원클릭 스튜디오
              </span>
            </h2>
            <p className="text-xs text-zinc-500">
              정사각형(1:1), 16:9, 4:3 비율 선택 · 배경 이미지/색상/그라데이션 및 자유 드래그 텍스트
            </p>
          </div>
        </div>

        {/* Ratio Selector Buttons */}
        <div className="flex items-center gap-1.5 bg-zinc-200/60 p-1 rounded-xl">
          {[
            { id: '1:1' as const, label: '정사각형 (1:1)', sub: '1080×1080' },
            { id: '16:9' as const, label: '와이드 (16:9)', sub: '1280×720' },
            { id: '4:3' as const, label: '클래식 (4:3)', sub: '1200×900' },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleRatioChange(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                ratio === r.id
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/60'
              }`}
            >
              <div>{r.label}</div>
              <div className="text-[10px] font-mono text-zinc-400 font-normal">{r.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Grid: Left Canvas Preview, Right Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
        {/* Left: Canvas Stage (8 cols on lg) */}
        <div className="lg:col-span-7 xl:col-span-8 p-4 sm:p-6 bg-zinc-100/80 flex flex-col items-center justify-center min-h-[460px] relative">
          {/* Canvas Wrapper with responsive scaling */}
          <div className="relative shadow-2xl rounded-xl overflow-hidden border border-zinc-300 max-w-full">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              className="block max-h-[58vh] max-w-full w-auto h-auto cursor-crosshair select-none"
              title="텍스트를 마우스로 드래그하여 원하는 위치로 이동하세요"
            />

            {/* Drag helper hint */}
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-md backdrop-blur-xs pointer-events-none select-none">
              텍스트를 마우스로 드래그해 이동하세요
            </div>
          </div>

          {/* Quick presets row */}
          <div className="mt-4 flex items-center flex-wrap justify-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              추천 텍스트 프리셋:
            </span>
            {STYLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-700 shadow-2xs transition-colors"
                title={p.description}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Controls & Properties Panel (4 cols on lg) */}
        <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-5 flex flex-col gap-5 max-h-[640px] overflow-y-auto">
          {/* 1. Background Settings */}
          <div>
            <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-zinc-500" />
                배경 설정
              </span>
              {bgType === 'image' && savedBgImage && (
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                  로컬 자동 보존 중
                </span>
              )}
            </div>

            {/* Bg Type Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-100 p-1 rounded-xl mb-3">
              {[
                { id: 'gradient' as const, label: '그라데이션' },
                { id: 'solid' as const, label: '단색 색상' },
                { id: 'image' as const, label: '배경 사진' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBgType(t.id)}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    bgType === t.id
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Case 1: Gradient Presets */}
            {bgType === 'gradient' && (
              <div className="grid grid-cols-4 gap-2">
                {GRADIENT_PRESETS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGradientId(g.id)}
                    className={`h-11 rounded-lg border text-left p-1.5 flex flex-col justify-end transition-transform ${
                      gradientId === g.id
                        ? 'ring-2 ring-black scale-102 shadow-xs'
                        : 'border-zinc-200 hover:scale-101'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})`,
                    }}
                    title={g.name}
                  >
                    <span className="text-[9px] font-bold text-white drop-shadow-xs truncate">
                      {g.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Case 2: Solid Colors */}
            {bgType === 'solid' && (
              <div className="space-y-2.5">
                <div className="flex items-center flex-wrap gap-1.5">
                  {SOLID_PRESETS.map((s) => (
                    <button
                      key={s.color}
                      type="button"
                      onClick={() => setSolidColor(s.color)}
                      className={`w-7 h-7 rounded-lg border transition-transform ${
                        solidColor === s.color
                          ? 'ring-2 ring-black scale-110 shadow-xs'
                          : 'border-zinc-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: s.color }}
                      title={s.label}
                    />
                  ))}
                  {/* Custom color input */}
                  <label
                    className="w-7 h-7 rounded-lg border border-dashed border-zinc-300 flex items-center justify-center cursor-pointer hover:border-zinc-500 overflow-hidden"
                    title="직접 색상 선택"
                  >
                    <input
                      type="color"
                      value={solidColor}
                      onChange={(e) => setSolidColor(e.target.value)}
                      className="opacity-0 w-0 h-0"
                    />
                    <Palette className="w-3.5 h-3.5 text-zinc-500" />
                  </label>
                </div>
              </div>
            )}

            {/* Case 3: Image Upload & LocalStorage Persistence */}
            {bgType === 'image' && (
              <div className="space-y-3">
                {savedBgImage ? (
                  <div className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={savedBgImage}
                        alt="배경 미리보기"
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-300 shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-zinc-900 truncate">
                          등록된 배경 이미지
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          재접속 시에도 브라우저에 영구 유지됩니다
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-colors cursor-pointer" title="이미지 교체">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleUploadBgImage(e.target.files[0])}
                          className="hidden"
                        />
                        <RefreshCw className="w-3.5 h-3.5" />
                      </label>
                      <button
                        type="button"
                        onClick={handleClearSavedBgImage}
                        className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="배경 이미지 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                    <Upload className="w-5 h-5 text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-700">
                      클릭하여 배경 사진 업로드
                    </span>
                    <span className="text-[10px] text-zinc-400 text-center">
                      설정된 사진은 변경/삭제하기 전까지 로컬에 자동 보관됩니다
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleUploadBgImage(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Dim overlay slider for image readability */}
                {savedBgImage && (
                  <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                    <div className="flex items-center justify-between text-xs text-zinc-700 mb-1">
                      <span>배경 어둡기 (글자 선명도):</span>
                      <span className="font-mono font-semibold">{Math.round(dimOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.8"
                      step="0.05"
                      value={dimOpacity}
                      onChange={(e) => setDimOpacity(parseFloat(e.target.value))}
                      className="w-full accent-black cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Text Layer List & Properties */}
          <div>
            <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-zinc-500" />
                텍스트 레이어 ({texts.length}개)
              </span>
              <button
                type="button"
                onClick={handleAddTextLayer}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-2xs"
              >
                <Plus className="w-3 h-3 text-amber-400" />
                <span>문구 추가</span>
              </button>
            </div>

            {/* Layer Selection Chips */}
            <div className="flex items-center flex-wrap gap-1.5 mb-3">
              {texts.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTextId(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all max-w-[140px] truncate ${
                    selectedTextId === t.id
                      ? 'bg-black text-white shadow-2xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  }`}
                >
                  {t.text ? t.text.split('\n')[0] : `텍스트 ${idx + 1}`}
                </button>
              ))}
            </div>

            {/* Active Text Inspector */}
            {selectedText ? (
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-800">텍스트 내용 수정</span>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedText}
                    className="p-1 text-rose-500 hover:text-rose-700 rounded transition-colors"
                    title="이 텍스트 레이어 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <textarea
                  value={selectedText.text}
                  onChange={(e) => updateSelectedText({ text: e.target.value })}
                  rows={2}
                  className="w-full text-xs p-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="표시할 텍스트 입력 (엔터로 줄바꿈)"
                />

                {/* Font Size & Weight & Color */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                      <span>글자 크기</span>
                      <span className="font-mono">{selectedText.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="24"
                      max="120"
                      step="2"
                      value={selectedText.fontSize}
                      onChange={(e) => updateSelectedText({ fontSize: parseInt(e.target.value, 10) })}
                      className="w-full accent-black cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] text-zinc-500 mb-1">글자 색상</div>
                    <div className="flex items-center gap-1">
                      {['#FFFFFF', '#FACC15', '#F87171', '#60A5FA', '#34D399', '#000000'].map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => updateSelectedText({ color: col })}
                          className={`w-5 h-5 rounded-md border ${
                            selectedText.color === col ? 'ring-2 ring-black scale-110' : 'border-zinc-300'
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alignment buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-200">
                  <span className="text-[11px] text-zinc-500">정렬:</span>
                  <div className="flex items-center gap-1">
                    {(['left', 'center', 'right'] as const).map((al) => (
                      <button
                        key={al}
                        type="button"
                        onClick={() => updateSelectedText({ align: al })}
                        className={`p-1 rounded ${
                          selectedText.align === al
                            ? 'bg-zinc-800 text-white'
                            : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                        }`}
                      >
                        {al === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                        {al === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                        {al === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>

                  {/* Center on canvas button */}
                  <button
                    type="button"
                    onClick={() => {
                      const size = getCanvasSize(ratio);
                      updateSelectedText({ x: Math.round(size.width / 2) });
                    }}
                    className="ml-auto text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 underline"
                  >
                    가운데 정렬
                  </button>
                </div>

                {/* Stroke (Border) & Shadow & Badge Toggles */}
                <div className="space-y-2 pt-1 border-t border-zinc-200 text-xs">
                  {/* Stroke */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedText.hasStroke}
                        onChange={(e) => updateSelectedText({ hasStroke: e.target.checked })}
                        className="rounded accent-black"
                      />
                      <span className="font-medium text-zinc-800">글자 외곽선(테두리)</span>
                    </label>
                    {selectedText.hasStroke && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400">두께 {selectedText.strokeWidth}px</span>
                        <input
                          type="range"
                          min="2"
                          max="12"
                          value={selectedText.strokeWidth}
                          onChange={(e) => updateSelectedText({ strokeWidth: parseInt(e.target.value, 10) })}
                          className="w-16 accent-black cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Shadow */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedText.hasShadow}
                        onChange={(e) => updateSelectedText({ hasShadow: e.target.checked })}
                        className="rounded accent-black"
                      />
                      <span className="font-medium text-zinc-800">부드러운 그림자</span>
                    </label>
                    {selectedText.hasShadow && (
                      <span className="text-[10px] text-zinc-400 font-mono">가독성 강화</span>
                    )}
                  </div>

                  {/* Highlight Badge Box */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedText.hasBadgeBg}
                        onChange={(e) => updateSelectedText({ hasBadgeBg: e.target.checked })}
                        className="rounded accent-black"
                      />
                      <span className="font-medium text-zinc-800">배경 하이라이트 박스</span>
                    </label>
                    {selectedText.hasBadgeBg && (
                      <div className="flex items-center gap-1">
                        {['#EF4444', '#18181B', '#2563EB', '#059669', 'rgba(0,0,0,0.65)'].map((bg) => (
                          <button
                            key={bg}
                            type="button"
                            onClick={() => updateSelectedText({ badgeBgColor: bg })}
                            className={`w-4 h-4 rounded-full border ${
                              selectedText.badgeBgColor === bg ? 'ring-1 ring-black' : 'border-zinc-300'
                            }`}
                            style={{ backgroundColor: bg }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-zinc-300 text-center text-xs text-zinc-400">
                위 목록에서 텍스트를 선택하거나 캔버스에서 직접 클릭하면 서식(글자 크기, 외곽선, 그림자, 하이라이트 등)을 조절할 수 있습니다.
              </div>
            )}
          </div>

          {/* 3. Export & Download Bar */}
          <div className="pt-3 border-t border-zinc-200 mt-auto">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-bold text-zinc-700">저장 포맷 선택:</span>
              <div className="flex items-center gap-1">
                {(['webp', 'jpg', 'png'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setDownloadFormat(fmt)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold uppercase transition-colors ${
                      downloadFormat === fmt
                        ? 'bg-black text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="w-full py-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>{isExporting ? '고화질 렌더링 중...' : `썸네일 다운로드 (${downloadFormat.toUpperCase()})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
