import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { ImageUploadDropzone } from './components/ImageUploadDropzone';
import { ImageList } from './components/ImageList';
import { EditorModal } from './components/EditorModal';
import { DownloadSummaryBar } from './components/DownloadSummaryBar';
import { OptimizationSettings, OptimizedImageItem, AspectRatioOption, WatermarkConfig } from './types';
import {
  processAndOptimizeImage,
  generateFilename,
  loadImage,
  downloadBlob,
} from './utils/imageProcessor';
import { createSampleImages } from './utils/sampleImages';
import { CheckCircle2, ShieldCheck, Zap, Image as ImageIcon, Sparkles } from 'lucide-react';

const WATERMARK_STORAGE_KEY = 'blog_optimizer_watermark_settings_v1';

const DEFAULT_WATERMARK: WatermarkConfig = {
  enabled: false,
  type: 'text',
  text: '© 부업하는 도도파파',
  textColor: '#FFFFFF',
  fontSize: 22,
  textBg: 'dark',
  imageDataUrl: null,
  imageFileName: undefined,
  position: 'bottom-right',
  opacity: 0.85,
  imageScale: 18,
};

function loadSavedWatermark(): WatermarkConfig {
  try {
    const saved = localStorage.getItem(WATERMARK_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_WATERMARK, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load watermark from localStorage', e);
  }
  return DEFAULT_WATERMARK;
}

const DEFAULT_SETTINGS: OptimizationSettings = {
  platform: 'naver',
  selectedRatio: '1:1',
  format: 'webp',
  quality: 85,
  maxWidthOption: '1200',
  padSmallImages: true,
  padColor: '#F4F4F5',
  filenamePrefix: 'naver-blog',
  slugify: true,
  numberPadding: 2,
  startNumber: 1,
  watermark: loadSavedWatermark(),
};

export default function App() {
  const [settings, setSettings] = useState<OptimizationSettings>(DEFAULT_SETTINGS);
  const [images, setImages] = useState<OptimizedImageItem[]>([]);
  const [editingImage, setEditingImage] = useState<OptimizedImageItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const isInitialMount = useRef(true);

  // Calculate ratio multiplier
  const getRatioMultiplier = (ratio: AspectRatioOption): number | undefined => {
    switch (ratio) {
      case '1:1':
        return 1.0;
      case '3:4':
        return 3 / 4;
      case '16:9':
        return 16 / 9;
      case '4:3':
        return 4 / 3;
      default:
        return undefined;
    }
  };

  // Add and process newly selected files
  const handleFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setIsProcessing(true);

    const ratioMultiplier = getRatioMultiplier(settings.selectedRatio);
    const newItems: OptimizedImageItem[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const index = images.length + i;
      const filename = generateFilename(
        settings.filenamePrefix,
        index,
        settings.format,
        settings.slugify,
        settings.numberPadding,
        settings.startNumber
      );

      // Convert file to dataURL
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const img = await loadImage(dataUrl);

      try {
        const optResult = await processAndOptimizeImage(dataUrl, settings, ratioMultiplier);
        const originalSize = file.size;
        const savingsPercent = originalSize > 0
          ? Math.round(((originalSize - optResult.size) / originalSize) * 100)
          : 0;

        newItems.push({
          id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          originalFile: file,
          originalName: file.name,
          originalSize,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          originalDataUrl: dataUrl,
          currentDataUrl: dataUrl,
          optimizedBlob: optResult.blob,
          optimizedDataUrl: optResult.dataUrl,
          optimizedSize: optResult.size,
          optimizedWidth: optResult.width,
          optimizedHeight: optResult.height,
          optimizedFilename: filename,
          savingsPercent,
          isProcessing: false,
          hasCustomEdits: false,
        });
      } catch (err) {
        console.error('Failed to process image:', file.name, err);
      }
    }

    setImages((prev) => [...prev, ...newItems]);
    setIsProcessing(false);
  };

  // When settings change (e.g. quality slider, ratio, prefix, format, watermark), recalculate batch
  const handleSettingsChange = async (newSettings: OptimizationSettings) => {
    setSettings(newSettings);

    // Persist watermark automatically to browser local storage
    if (newSettings.watermark) {
      try {
        localStorage.setItem(WATERMARK_STORAGE_KEY, JSON.stringify(newSettings.watermark));
      } catch (err) {
        console.warn('Failed to save watermark to localStorage:', err);
      }
    }

    if (images.length === 0) return;

    const ratioMultiplier = getRatioMultiplier(newSettings.selectedRatio);

    const updated = await Promise.all(
      images.map(async (item, idx) => {
        const filename = generateFilename(
          newSettings.filenamePrefix,
          idx,
          newSettings.format,
          newSettings.slugify,
          newSettings.numberPadding,
          newSettings.startNumber
        );

        // Re-optimize using currentDataUrl (which holds edits if any)
        try {
          // If custom edited, preserve user's manual crop/canvas rather than forcing center crop
          const applyRatio = item.hasCustomEdits ? undefined : ratioMultiplier;
          const optResult = await processAndOptimizeImage(
            item.currentDataUrl,
            newSettings,
            applyRatio
          );
          const savingsPercent = item.originalSize > 0
            ? Math.round(((item.originalSize - optResult.size) / item.originalSize) * 100)
            : 0;

          return {
            ...item,
            optimizedBlob: optResult.blob,
            optimizedDataUrl: optResult.dataUrl,
            optimizedSize: optResult.size,
            optimizedWidth: optResult.width,
            optimizedHeight: optResult.height,
            optimizedFilename: filename,
            savingsPercent,
          };
        } catch (err) {
          return item;
        }
      })
    );

    setImages(updated);
  };

  // Reset to default settings
  const handleResetSettings = () => {
    handleSettingsChange(DEFAULT_SETTINGS);
  };

  // Add sample photos for instant testing
  const handleAddSampleImages = async () => {
    setIsProcessing(true);
    try {
      const sampleFiles = await createSampleImages();
      await handleFilesSelected(sampleFiles);
    } catch (err) {
      console.error('Error generating samples:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save changes from the Canvas Editor Modal
  const handleSaveEditor = async (imageId: string, newDataUrl: string) => {
    const target = images.find((img) => img.id === imageId);
    if (!target) return;

    try {
      // Re-run optimization on the freshly edited canvas without forced center-crop
      const optResult = await processAndOptimizeImage(newDataUrl, settings, undefined);
      const savingsPercent = target.originalSize > 0
        ? Math.round(((target.originalSize - optResult.size) / target.originalSize) * 100)
        : 0;

      setImages((prev) =>
        prev.map((item) => {
          if (item.id === imageId) {
            return {
              ...item,
              currentDataUrl: newDataUrl,
              hasCustomEdits: true,
              optimizedBlob: optResult.blob,
              optimizedDataUrl: optResult.dataUrl,
              optimizedSize: optResult.size,
              optimizedWidth: optResult.width,
              optimizedHeight: optResult.height,
              savingsPercent,
            };
          }
          return item;
        })
      );
    } catch (err) {
      console.error('Failed to save edited image:', err);
    }
  };

  // Single file download
  const handleDownloadSingle = (item: OptimizedImageItem) => {
    if (item.optimizedBlob) {
      downloadBlob(item.optimizedBlob, item.optimizedFilename);
    } else if (item.optimizedDataUrl) {
      fetch(item.optimizedDataUrl)
        .then((r) => r.blob())
        .then((blob) => downloadBlob(blob, item.optimizedFilename));
    }
  };

  // Remove single image
  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Clear all images
  const handleClearAll = () => {
    setImages([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8FA] text-[#18181B] selection:bg-black selection:text-white">
      {/* Header with requested Title & "부업하는 도도파파" link */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Intro banner / Trust badges */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium text-zinc-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              서버 전송 없는 100% 브라우저 로컬 변환 (개인정보 안전)
            </span>
            <span className="hidden sm:inline text-zinc-300">•</span>
            <span className="flex items-center gap-1.5 font-medium text-zinc-700">
              <Zap className="w-4 h-4 text-amber-500" />
              네이버 스마트에디터 썸네일(1:1) & 본문 WebP 자동 최적화
            </span>
          </div>

          <div className="text-zinc-400">
            GitHub Pages 배포 호환 · 클라이언트 Canvas API 구동
          </div>
        </div>

        {/* 1. Presets and Optimization Settings */}
        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          onReset={handleResetSettings}
          totalImages={images.length}
        />

        {/* 2. Drag & Drop Upload Zone */}
        <ImageUploadDropzone
          onFilesSelected={handleFilesSelected}
          onAddSampleImages={handleAddSampleImages}
          isLoading={isProcessing}
        />

        {/* 3. Converted Images List with Before/After Comparison & Editor Entry */}
        <ImageList
          images={images}
          onOpenEditor={(img) => setEditingImage(img)}
          onRemoveImage={handleRemoveImage}
          onDownloadSingle={handleDownloadSingle}
        />

        {/* Empty state guidance when no images are uploaded yet */}
        {images.length === 0 && (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-zinc-300 bg-white/60">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 mb-1">
              아직 등록된 이미지가 없습니다
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mb-4">
              위 영역에 블로그에 올릴 사진들을 드래그하여 올려보세요.
              자동으로 WebP 규격 변환, 용량 압축 및 네이버 최적화 비율이 계산됩니다.
            </p>
            <button
              type="button"
              onClick={handleAddSampleImages}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:bg-zinc-800 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              샘플 이미지로 바로 테스트해보기
            </button>
          </div>
        )}
      </main>

      {/* 4. Bottom Sticky Summary Bar for ZIP bulk download */}
      <DownloadSummaryBar images={images} onClearAll={handleClearAll} />

      {/* 5. Studio Canvas Editor Modal (Crop, Arrow, Text, Mosaic, Undo/Reset) */}
      {editingImage && (
        <EditorModal
          image={editingImage}
          initialRatio={settings.selectedRatio}
          onSave={handleSaveEditor}
          onClose={() => setEditingImage(null)}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 bg-white py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © 2026 <strong>블로그 이미지 최적화도구</strong> · Designed for Naver, Tistory & WordPress
          </div>
          <div className="flex items-center gap-2">
            <span>Special thanks to</span>
            <a
              href="https://blog.naver.com/lonnie79"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-zinc-900 hover:underline"
            >
              부업하는 도도파파
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
