import React, { useRef, useState, useEffect } from 'react';
import { Upload, Sparkles, AlertCircle, Trash2, Image as ImageIcon } from 'lucide-react';
import { OptimizedImageItem } from '../types';
import { formatBytes } from '../utils/imageProcessor';

interface ImageUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onAddSampleImages: () => void;
  isLoading?: boolean;
  images?: OptimizedImageItem[];
  onRemoveImage?: (id: string) => void;
  onClearAll?: () => void;
}

export function ImageUploadDropzone({
  onFilesSelected,
  onAddSampleImages,
  isLoading = false,
  images = [],
  onRemoveImage,
  onClearAll,
}: ImageUploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler for quick pasting screenshots or copied images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        onFilesSelected(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected]);

  const validateAndAddFiles = (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const validFiles: File[] = [];
    let nonImageFound = false;

    Array.from(fileList).forEach((file) => {
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      } else {
        nonImageFound = true;
      }
    });

    if (nonImageFound) {
      setErrorMessage('이미지 파일(JPG, PNG, WebP, GIF, BMP 등)만 업로드할 수 있습니다.');
      setTimeout(() => setErrorMessage(null), 4000);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const hasImages = images.length > 0;

  return (
    <div className="space-y-3 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Upload Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-center text-center lg:col-span-6 xl:col-span-5 p-6 sm:p-7 ${
            isDragOver
              ? 'border-black bg-zinc-100 scale-[1.005]'
              : 'border-zinc-300 hover:border-black bg-white hover:bg-zinc-50/70 shadow-xs'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                validateAndAddFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />

          <div className="flex flex-col items-center justify-center gap-2.5 max-w-md mx-auto">
            <div
              className={`rounded-2xl flex items-center justify-center transition-transform duration-200 w-12 h-12 ${
                isDragOver
                  ? 'bg-black text-white scale-110'
                  : 'bg-zinc-100 text-zinc-800 group-hover:scale-105'
              }`}
            >
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <p className="font-bold text-zinc-900 mb-0.5 text-sm sm:text-base">
                이미지들을 여기에 드래그하거나 클릭하여 추가
              </p>
              <p className="text-[11px] sm:text-xs text-zinc-500 leading-snug">
                JPG, PNG, WebP, GIF 일괄 선택 지원 · 클립보드 붙여넣기(Ctrl+V) 가능
              </p>
            </div>

            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] sm:text-[11px] font-medium border border-emerald-200">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                GPS 위치 및 카메라 메타정보(EXIF) 100% 자동 소거
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-black text-white text-xs font-semibold hover:bg-zinc-800 transition-colors pointer-events-none"
              >
                내 PC 파일 선택
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSampleImages();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors border border-zinc-200"
                title="테스트용 예시 이미지 로드"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                샘플 이미지
              </button>
            </div>
          </div>
        </div>

        {/* Right: Uploaded Images Thumbnail Queue / List (Fixed layout, always visible) */}
        <div className="lg:col-span-6 xl:col-span-7 bg-white rounded-2xl border border-zinc-200 p-3.5 flex flex-col justify-between shadow-xs min-h-[220px]">
          {/* Header: Title + Image count + Clear All button */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-zinc-600" />
                <span>업로드 대기 목록</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                hasImages ? 'bg-zinc-100 border border-zinc-200 text-zinc-800' : 'bg-zinc-50 text-zinc-400'
              }`}>
                {images.length}개
              </span>
            </div>

            {hasImages && onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-rose-600 hover:bg-rose-50 text-[11px] font-medium transition-colors border border-transparent hover:border-rose-200"
                title="등록된 모든 이미지 비우기"
              >
                <Trash2 className="w-3 h-3" />
                <span>전체 비우기</span>
              </button>
            )}
          </div>

          {/* List Area */}
          {hasImages ? (
            <div className="flex-1 overflow-y-auto max-h-[190px] sm:max-h-[220px] pr-1 divide-y divide-zinc-100">
              {images.map((item, index) => (
                <div
                  key={item.id}
                  className="py-1.5 px-2 flex items-center justify-between gap-2.5 hover:bg-zinc-50 rounded-lg transition-colors select-none"
                >
                  {/* Left: Index + Mini Text-sized Thumbnail + Filename (No click action) */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[11px] font-mono font-bold text-zinc-400 w-4 shrink-0 text-right">
                      {index + 1}
                    </span>

                    {/* Mini Thumbnail matching text height (~18x18px) */}
                    <div className="w-4.5 h-4.5 rounded-xs bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center pointer-events-none">
                      <img
                        src={item.optimizedDataUrl || item.currentDataUrl}
                        alt={item.optimizedFilename}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Filename and size info */}
                    <div className="min-w-0 flex-1 flex items-center gap-1.5">
                      <span
                        className="text-xs font-medium text-zinc-800 truncate"
                        title={item.optimizedFilename}
                      >
                        {item.optimizedFilename}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono shrink-0 hidden sm:inline">
                        ({formatBytes(item.optimizedSize || item.originalSize)})
                      </span>
                    </div>
                  </div>

                  {/* Right: Delete button only */}
                  {onRemoveImage && (
                    <button
                      type="button"
                      onClick={() => onRemoveImage(item.id)}
                      className="text-zinc-300 hover:text-rose-600 p-1 rounded transition-colors shrink-0 cursor-pointer"
                      title="목록에서 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Empty state when no images are added yet */
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-zinc-400">
              <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center mb-1.5 text-zinc-400">
                <ImageIcon className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-zinc-600 mb-0.5">대기 중인 이미지가 없습니다</p>
              <p className="text-[11px] text-zinc-400">왼쪽 창에 이미지를 추가하면 목록에 표시됩니다</p>
            </div>
          )}

          {/* Bottom info footer */}
          <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="text-zinc-400">
              {hasImages ? `총 ${images.length}개의 파일 대기 중` : '대기 파일 0개'}
            </span>
            <span className="font-mono text-zinc-500 font-medium">
              {hasImages
                ? `합계 ${formatBytes(images.reduce((acc, img) => acc + (img.optimizedSize || img.originalSize), 0))}`
                : '-'}
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
