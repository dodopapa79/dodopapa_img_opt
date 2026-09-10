import React, { useState } from 'react';
import { Download, Archive, Trash2, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { OptimizedImageItem } from '../types';
import { formatBytes, createZipAndDownload } from '../utils/imageProcessor';

interface DownloadSummaryBarProps {
  images: OptimizedImageItem[];
  onClearAll: () => void;
}

export function DownloadSummaryBar({ images, onClearAll }: DownloadSummaryBarProps) {
  const [isZipping, setIsZipping] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);

  if (images.length === 0) return null;

  const totalOriginalSize = images.reduce((acc, img) => acc + img.originalSize, 0);
  const totalOptimizedSize = images.reduce((acc, img) => acc + (img.optimizedSize || img.originalSize), 0);
  const totalSavingsBytes = Math.max(0, totalOriginalSize - totalOptimizedSize);
  const totalSavingsPercent = totalOriginalSize > 0
    ? Math.round((totalSavingsBytes / totalOriginalSize) * 100)
    : 0;

  const handleZipDownload = async () => {
    if (images.length === 0) return;
    setIsZipping(true);
    setZipSuccess(false);

    try {
      const itemsToZip = images.map((img) => ({
        filename: img.optimizedFilename,
        blob: img.optimizedBlob,
        dataUrl: img.optimizedDataUrl || img.currentDataUrl,
      }));

      await createZipAndDownload(itemsToZip, 'blog-optimized-images.zip');
      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 4000);
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="sticky bottom-4 z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pointer-events-none">
      <div className="bg-zinc-900 text-white rounded-2xl shadow-2xl p-4 sm:p-5 border border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto backdrop-blur-lg">
        {/* Left: Stats & Savings badge */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
            <Archive className="w-5 h-5 text-emerald-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base">
                총 {images.length}개 이미지 최적화
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                {totalSavingsPercent}% 절감
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
              <span className="line-through">{formatBytes(totalOriginalSize)}</span>
              <ArrowRight className="w-3 h-3 text-zinc-500" />
              <span className="text-white font-bold">{formatBytes(totalOptimizedSize)}</span>
              <span className="text-emerald-400 font-medium">
                ({formatBytes(totalSavingsBytes)} 절약)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onClearAll}
            className="px-3.5 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors flex items-center gap-1.5"
            title="전체 목록 비우기"
          >
            <Trash2 className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">전체 비우기</span>
          </button>

          <button
            type="button"
            onClick={handleZipDownload}
            disabled={isZipping}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 active:scale-95 text-black font-bold text-sm shadow-md transition-all disabled:opacity-50"
          >
            {isZipping ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>압축 파일 생성 중...</span>
              </>
            ) : zipSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>다운로드 완료!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-black" />
                <span>일괄 다운로드 (.ZIP)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
