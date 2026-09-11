import {
  Download,
  Edit3,
  Trash2,
  ArrowRight,
  Sparkles,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import { OptimizedImageItem } from '../types';
import { formatBytes, downloadBlob } from '../utils/imageProcessor';

interface ImageListProps {
  images: OptimizedImageItem[];
  onOpenEditor: (image: OptimizedImageItem) => void;
  onRemoveImage: (id: string) => void;
  onDownloadSingle: (image: OptimizedImageItem) => void;
}

export function ImageList({
  images,
  onOpenEditor,
  onRemoveImage,
  onDownloadSingle,
}: ImageListProps) {
  if (images.length === 0) return null;

  return (
    <section className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <span>변환 및 최적화 목록</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800 text-xs font-semibold">
            {images.length}개
          </span>
        </h3>
        <p className="text-xs text-zinc-500">
          이미지를 클릭하거나 [편집] 버튼을 누르면 자르기/화살표/모자이크 스튜디오가 열립니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.map((item, index) => {
          const savings = item.savingsPercent || 0;
          const isPositiveSavings = savings > 0;

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-zinc-200 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between group"
            >
              <div className="flex gap-4">
                {/* Thumbnail Preview (Clickable to open Editor) */}
                <div
                  onClick={() => onOpenEditor(item)}
                  className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200 cursor-pointer group-hover:ring-2 group-hover:ring-black transition-all"
                  title="클릭하여 대형 에디터 열기"
                >
                  <img
                    src={item.optimizedDataUrl || item.currentDataUrl}
                    alt={item.optimizedFilename}
                    className="w-full h-full object-cover"
                  />
                  {item.hasCustomEdits && (
                    <span className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      편집됨
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>편집하기</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    {/* Index & Name */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-bold text-zinc-500 font-mono">
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveImage(item.id)}
                        className="text-zinc-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="목록에서 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="font-bold text-xs sm:text-sm text-zinc-900 truncate mb-1" title={item.optimizedFilename}>
                      {item.optimizedFilename}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mb-2">
                      원본: {item.originalName} ({item.originalWidth}×{item.originalHeight})
                    </div>
                  </div>

                  {/* Size Comparison Badge (As requested: 2.1MB -> 380KB [-82%]) */}
                  <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500 font-medium line-through">
                          {formatBytes(item.originalSize)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className="font-bold text-zinc-900">
                          {formatBytes(item.optimizedSize)}
                        </span>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isPositiveSavings
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {isPositiveSavings ? `-${savings}%` : '유사'}
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-500 mt-1 flex items-center justify-between">
                      <span>최적화 해상도: {item.optimizedWidth}×{item.optimizedHeight}px</span>
                      <span className="font-mono text-zinc-400 uppercase">
                        {item.optimizedFilename.split('.').pop()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => onOpenEditor(item)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-zinc-600" />
                  <span>캔버스 편집</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDownloadSingle(item)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>개별 다운로드</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
