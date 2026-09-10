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

  const positions: { id: WatermarkPosition; label: string; icon: React.ReactNode }[] = [
    { id: 'top-left', label: '상단 좌측', icon: <CornerUpLeft className="w-3.5 h-3.5" /> },
    { id: 'top-right', label: '상단 우측', icon: <CornerUpRight className="w-3.5 h-3.5" /> },
    { id: 'bottom-left', label: '하단 좌측', icon: <CornerDownLeft className="w-3.5 h-3.5" /> },
    { id: 'bottom-right', label: '하단 우측', icon: <CornerDownRight className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Header with Enable Switch and LocalStorage Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-900">4. 블로그 워터마크 자동 삽입</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                로컬 영구 저장
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              이미지 최적화 시 상/하단 4분면에 텍스트 문구 또는 로고 이미지를 자동 합성합니다.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="inline-flex items-center gap-2 cursor-pointer self-start sm:self-center">
          <span className="text-xs font-semibold text-zinc-700">
            {watermark.enabled ? '워터마크 켜짐' : '워터마크 꺼짐'}
          </span>
          <div className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={watermark.enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </div>
        </label>
      </div>

      {watermark.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1 animate-fade-in">
          {/* Column 1: 4-Corner Position Selector & Mini Preview (Span 5) */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                <span>배열 위치 선택 (4분면)</span>
              </span>
              <span className="text-[11px] text-emerald-600 font-medium font-mono">
                {positions.find((p) => p.id === watermark.position)?.label}
              </span>
            </div>

            {/* Visual 2x2 Quadrant Grid */}
            <div className="relative aspect-[16/10] bg-zinc-900 rounded-xl border border-zinc-800 p-3 flex flex-col justify-between overflow-hidden shadow-inner group">
              {/* Background preview grid lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-30 pointer-events-none" />

              {/* Watermark position buttons inside grid */}
              <div className="flex justify-between z-10">
                {/* Top-Left */}
                <button
                  type="button"
                  onClick={() => handlePositionChange('top-left')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    watermark.position === 'top-left'
                      ? 'bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-300 scale-105'
                      : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  <CornerUpLeft className="w-3.5 h-3.5" />
                  <span>상단 좌측</span>
                </button>

                {/* Top-Right */}
                <button
                  type="button"
                  onClick={() => handlePositionChange('top-right')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    watermark.position === 'top-right'
                      ? 'bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-300 scale-105'
                      : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  <span>상단 우측</span>
                  <CornerUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Center visual label */}
              <div className="text-center z-10 pointer-events-none">
                <span className="text-[11px] text-zinc-500 tracking-wider uppercase font-semibold">
                  사진 영역 (미리보기)
                </span>
              </div>

              <div className="flex justify-between z-10">
                {/* Bottom-Left */}
                <button
                  type="button"
                  onClick={() => handlePositionChange('bottom-left')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    watermark.position === 'bottom-left'
                      ? 'bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-300 scale-105'
                      : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>하단 좌측</span>
                </button>

                {/* Bottom-Right */}
                <button
                  type="button"
                  onClick={() => handlePositionChange('bottom-right')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    watermark.position === 'bottom-right'
                      ? 'bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-300 scale-105'
                      : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  <span>하단 우측</span>
                  <CornerDownRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Transparency / Opacity Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-zinc-700">투명도 (불투명도)</span>
                <span className="font-mono text-zinc-500 font-semibold">
                  {Math.round(watermark.opacity * 100)}%
                </span>
              </div>
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

          {/* Column 2: Watermark Content (Text vs Image) (Span 7) */}
          <div className="md:col-span-7 space-y-3.5 md:border-l md:border-zinc-200 md:pl-5">
            {/* Tab Selector: Text vs Image */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('text')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  watermark.type === 'text'
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>문구 직접 입력</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('image')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  watermark.type === 'image'
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>이미지/로고 업로드</span>
              </button>
            </div>

            {/* TEXT MODE CONFIGURATION */}
            {watermark.type === 'text' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 flex items-center justify-between">
                    <span>표시할 워터마크 문구</span>
                    <span className="text-[10px] text-zinc-400">자동 줄바꿈 방지</span>
                  </label>
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black bg-zinc-50 focus:bg-white transition-all font-medium"
                  />
                </div>

                {/* Quick suggestions */}
                <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
                  <span className="text-zinc-400 text-[10px]">추천 문구:</span>
                  {[
                    '© 부업하는 도도파파',
                    'blog.naver.com/lonnie79',
                    '무단전재 및 불펌금지',
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
                      className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Text Styling Options: Color, Font Size, Background */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {/* Text Color */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-zinc-600">글자색</span>
                    <div className="flex items-center gap-1 bg-zinc-50 p-1.5 rounded-lg border border-zinc-200">
                      {[
                        { color: '#FFFFFF', label: '흰색' },
                        { color: '#000000', label: '검정' },
                        { color: '#FACC15', label: '노랑' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() =>
                            onChange({
                              ...watermark,
                              textColor: c.color,
                            })
                          }
                          style={{ backgroundColor: c.color }}
                          className={`w-5 h-5 rounded-full border transition-transform ${
                            watermark.textColor === c.color
                              ? 'scale-110 border-zinc-900 ring-2 ring-black/20'
                              : 'border-zinc-300 hover:scale-105'
                          }`}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Text Background style */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-zinc-600">스타일</span>
                    <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-lg border border-zinc-200">
                      {[
                        { id: 'dark', label: '어두움' },
                        { id: 'light', label: '밝음' },
                        { id: 'none', label: '그림자' },
                      ].map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() =>
                            onChange({
                              ...watermark,
                              textBg: bg.id as any,
                            })
                          }
                          className={`flex-1 py-1 rounded text-[10px] font-medium transition-all ${
                            watermark.textBg === bg.id
                              ? 'bg-black text-white font-bold shadow-2xs'
                              : 'text-zinc-600 hover:text-black'
                          }`}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font size */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-zinc-600">글자 크기</span>
                    <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-lg border border-zinc-200">
                      {[
                        { size: 16, label: '소' },
                        { size: 22, label: '중' },
                        { size: 30, label: '대' },
                      ].map((s) => (
                        <button
                          key={s.size}
                          type="button"
                          onClick={() =>
                            onChange({
                              ...watermark,
                              fontSize: s.size,
                            })
                          }
                          className={`flex-1 py-1 rounded text-[10px] font-medium transition-all ${
                            watermark.fontSize === s.size
                              ? 'bg-black text-white font-bold shadow-2xs'
                              : 'text-zinc-600 hover:text-black'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* IMAGE MODE CONFIGURATION */}
            {watermark.type === 'image' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageFile}
                  className="hidden"
                />

                {watermark.imageDataUrl ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-white border border-zinc-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
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
                        <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>로컬 브라우저에 저장됨</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors"
                      >
                        변경
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 border-2 border-dashed border-zinc-300 hover:border-black rounded-xl cursor-pointer text-center space-y-2 bg-zinc-50/50 hover:bg-zinc-50 transition-all group"
                  >
                    <div className="w-10 h-10 mx-auto rounded-full bg-zinc-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-zinc-600" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">
                        워터마크 로고 이미지 업로드
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        PNG (투명 배경 권장), JPG, WebP 파일 지원
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick button to use profile logo */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleUseProfileLogo}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-black font-medium hover:underline"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>현재 프로그램 프로필 이미지로 설정</span>
                  </button>
                </div>

                {/* Image scale slider */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-700">로고 크기 비율</span>
                    <span className="font-mono text-zinc-500 font-semibold">
                      가로의 {watermark.imageScale || 18}%
                    </span>
                  </div>
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
              </div>
            )}

            {/* Bottom Actions: Storage Status and Delete Button */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>삭제 전까지 브라우저 로컬에 계속 유지됩니다</span>
              </span>

              <button
                type="button"
                onClick={onDeleteWatermark}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                title="워터마크를 삭제하고 초기화합니다"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>워터마크 삭제/초기화</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
