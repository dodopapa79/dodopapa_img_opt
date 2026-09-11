import React, { useRef } from 'react';
import {
  Shield,
  Upload,
  Trash2,
  Check,
  Sparkles,
  Type,
  Image as ImageIcon,
  CheckCircle2,
  HelpCircle,
  CornerDownRight,
  CornerDownLeft,
  CornerUpRight,
  CornerUpLeft,
} from 'lucide-react';
import { WatermarkConfig, WatermarkPosition } from '../types';

interface WatermarkSettingsProps {
  watermark: WatermarkConfig;
  onChange: (newWatermark: WatermarkConfig) => void;
  onDeleteWatermark: () => void;
}

export function WatermarkSettings({
  watermark,
  onChange,
  onDeleteWatermark,
}: WatermarkSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = (enabled: boolean) => {
    onChange({
      ...watermark,
      enabled,
    });
  };

  const handlePositionChange = (pos: WatermarkPosition) => {
    onChange({
      ...watermark,
      position: pos,
    });
  };

  const handleTypeChange = (type: 'text' | 'image') => {
    onChange({
      ...watermark,
      type,
    });
  };

  // Image Upload handler (converts to base64 DataURL for persistent localStorage saving)
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onChange({
        ...watermark,
        type: 'image',
        imageDataUrl: dataUrl,
        imageFileName: file.name,
        enabled: true,
      });
    };
    reader.readAsDataURL(file);
  };

  // Quick preset: Use profile logo as watermark
  const handleUseProfileLogo = () => {
    // Convert /profile-logo.png to dataUrl
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        onChange({
          ...watermark,
          type: 'image',
          imageDataUrl: dataUrl,
          imageFileName: '도도파파_프로필_로고.png',
          enabled: true,
        });
      }
    };
    img.src = '/profile-logo.png';
  };

  const positions: { id: WatermarkPosition; label: string; short: string; icon: React.ReactNode }[] = [
    { id: 'top-left', label: '상단 좌측', short: '좌상', icon: <CornerUpLeft className="w-3.5 h-3.5" /> },
    { id: 'top-right', label: '상단 우측', short: '우상', icon: <CornerUpRight className="w-3.5 h-3.5" /> },
    { id: 'bottom-left', label: '하단 좌측', short: '좌하', icon: <CornerDownLeft className="w-3.5 h-3.5" /> },
    { id: 'bottom-right', label: '하단 우측', short: '우하', icon: <CornerDownRight className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5 space-y-3">
      {/* Header with Enable Switch and LocalStorage Notice */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-zinc-900 whitespace-nowrap">
                3. 워터마크 자동 삽입
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200 whitespace-nowrap">
                로컬 저장
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block truncate">
              변환 시 지정한 위치(4분면)에 텍스트 문구 또는 로고 이미지를 자동 합성합니다.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
          <span className="text-xs font-semibold text-zinc-700 hidden xs:inline">
            {watermark.enabled ? '워터마크 ON' : '워터마크 OFF'}
          </span>
          <div className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={watermark.enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </div>
        </label>
      </div>

      {watermark.enabled && (
        <div className="space-y-3 pt-1 animate-fade-in text-xs">
          {/* Top Row: Type Switch (Text vs Image) & Quick Profile Button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex p-0.5 bg-zinc-100 rounded-lg border border-zinc-200/80">
              <button
                type="button"
                onClick={() => handleTypeChange('text')}
                className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-semibold transition-all ${
                  watermark.type === 'text'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>문구 직접 입력</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('image')}
                className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-semibold transition-all ${
                  watermark.type === 'image'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>이미지/로고</span>
              </button>
            </div>

            {watermark.type === 'image' && (
              <button
                type="button"
                onClick={handleUseProfileLogo}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:text-black font-medium hover:underline py-1"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>프로필 로고 즉시 적용</span>
              </button>
            )}
          </div>

          {/* TEXT MODE CONFIGURATION */}
          {watermark.type === 'text' && (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={watermark.text}
                  onChange={(e) =>
                    onChange({
                      ...watermark,
                      text: e.target.value,
                    })
                  }
                  placeholder="예: © 부업하는 도도파파"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black bg-zinc-50 focus:bg-white transition-all font-medium"
                />

                {/* Quick suggestions */}
                <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                  {[
                    '© 부업하는 도도파파',
                    'blog.naver.com/lonnie79',
                    '무단전재 불펌금지',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...watermark,
                          text: preset,
                        })
                      }
                      className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* IMAGE MODE CONFIGURATION */}
          {watermark.type === 'image' && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageFile}
                className="hidden"
              />

              {watermark.imageDataUrl ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                      <img
                        src={watermark.imageDataUrl}
                        alt="워터마크 이미지"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 truncate">
                        {watermark.imageFileName || '업로드된 로고 이미지'}
                      </div>
                      <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>로컬 저장됨</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors shrink-0"
                  >
                    로고 교체
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 border-2 border-dashed border-zinc-300 hover:border-black rounded-xl cursor-pointer text-center flex items-center justify-center gap-2 bg-zinc-50/50 hover:bg-zinc-50 transition-all"
                >
                  <Upload className="w-4 h-4 text-zinc-600" />
                  <span className="text-xs font-bold text-zinc-800">
                    워터마크 로고 이미지 업로드 (PNG 투명배경 권장)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Compact Control Grid: Position (Slim 4 buttons) | Size | Opacity | Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
            {/* 1. Slim Position Selector (Requested Reduction) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
                <span>배열 위치 (4분면)</span>
                <span className="text-emerald-600 font-mono text-[10px]">
                  {positions.find((p) => p.id === watermark.position)?.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {positions.map((pos) => {
                  const isSelected = watermark.position === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => handlePositionChange(pos.id)}
                      className={`py-1 px-1 rounded-lg flex items-center justify-center gap-0.5 text-[11px] font-semibold transition-all ${
                        isSelected
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100 hover:text-black'
                      }`}
                      title={pos.label}
                    >
                      {pos.icon}
                      <span className="text-[10px]">{pos.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Size Control (Font Size or Image Scale) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
                <span>{watermark.type === 'text' ? '글자 크기' : '로고 배율'}</span>
                <span className="font-mono text-zinc-500 text-[10px]">
                  {watermark.type === 'text'
                    ? `${watermark.fontSize}px`
                    : `${watermark.imageScale || 18}%`}
                </span>
              </div>
              {watermark.type === 'text' ? (
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { size: 16, label: '소 (16)' },
                    { size: 22, label: '중 (22)' },
                    { size: 30, label: '대 (30)' },
                  ].map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => onChange({ ...watermark, fontSize: s.size })}
                      className={`py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        watermark.fontSize === s.size
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pt-1">
                  <input
                    type="range"
                    min="10"
                    max="35"
                    step="1"
                    value={watermark.imageScale || 18}
                    onChange={(e) =>
                      onChange({
                        ...watermark,
                        imageScale: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
              )}
            </div>

            {/* 3. Opacity Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
                <span>투명도 (불투명)</span>
                <span className="font-mono text-zinc-500 text-[10px]">
                  {Math.round(watermark.opacity * 100)}%
                </span>
              </div>
              <div className="pt-1">
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={watermark.opacity}
                  onChange={(e) =>
                    onChange({
                      ...watermark,
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
            </div>

            {/* 4. Text Color / Background Style */}
            {watermark.type === 'text' ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
                  <span>색상 및 배경</span>
                  <span className="text-[10px] text-zinc-400">
                    {watermark.textBg === 'dark' ? '다크' : watermark.textBg === 'light' ? '라이트' : '그림자'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Colors */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-zinc-200">
                    {[
                      { color: '#FFFFFF', label: '흰색' },
                      { color: '#000000', label: '검정' },
                      { color: '#FACC15', label: '노랑' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => onChange({ ...watermark, textColor: c.color })}
                        style={{ backgroundColor: c.color }}
                        className={`w-4 h-4 rounded-full border transition-transform ${
                          watermark.textColor === c.color
                            ? 'scale-110 border-zinc-900 ring-2 ring-black/20'
                            : 'border-zinc-300'
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>

                  {/* BG Modes */}
                  <div className="flex-1 grid grid-cols-3 gap-0.5 bg-white p-0.5 rounded-lg border border-zinc-200">
                    {[
                      { id: 'dark', label: '어두움' },
                      { id: 'light', label: '밝음' },
                      { id: 'none', label: '투명' },
                    ].map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => onChange({ ...watermark, textBg: bg.id as any })}
                        className={`py-0.5 rounded text-[10px] font-semibold transition-all ${
                          watermark.textBg === bg.id
                            ? 'bg-black text-white'
                            : 'text-zinc-600 hover:text-black'
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end pt-3">
                <button
                  type="button"
                  onClick={onDeleteWatermark}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>워터마크 삭제</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom subtle bar */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5 px-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>브라우저 로컬 저장되어 다음 방문 시에도 유지됩니다</span>
            </span>
            {watermark.type === 'text' && (
              <button
                type="button"
                onClick={onDeleteWatermark}
                className="text-zinc-400 hover:text-rose-600 transition-colors inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>초기화</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
