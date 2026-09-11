import React, { useRef, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';

interface ImageUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onAddSampleImages: () => void;
  isLoading?: boolean;
}

export function ImageUploadDropzone({
  onFilesSelected,
  onAddSampleImages,
  isLoading = false,
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

  return (
    <div className="space-y-3 mb-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
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
              e.target.value = ''; // allow re-uploading same file if desired
            }
          }}
        />

        <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-200 ${
              isDragOver
                ? 'bg-black text-white scale-110'
                : 'bg-zinc-100 text-zinc-800 group-hover:scale-105'
            }`}
          >
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <p className="text-base font-bold text-zinc-900 mb-1">
              이미지들을 여기에 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-xs text-zinc-500">
              JPG, PNG, WebP, GIF 등 복수 이미지 일괄 선택 지원 · 클립보드 붙여넣기(Ctrl+V) 가능
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              안심 개인정보 보호: GPS 위치 및 카메라 메타정보(EXIF) 100% 자동 소거
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:bg-zinc-800 transition-colors pointer-events-none"
            >
              내 PC에서 파일 찾기
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddSampleImages();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors border border-zinc-200"
              title="테스트용 예시 이미지 로드"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              샘플 이미지로 체험하기
            </button>
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
