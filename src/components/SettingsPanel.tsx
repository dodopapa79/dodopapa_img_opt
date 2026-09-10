import { useState } from 'react';
import {
  Sparkles,
  Sliders,
  FileText,
  HelpCircle,
  Check,
  RotateCcw
} from 'lucide-react';
import { OptimizationSettings, PlatformType, AspectRatioOption, OutputFormat, WatermarkConfig } from '../types';
import { WatermarkSettings } from './WatermarkSettings';

interface SettingsPanelProps {
  settings: OptimizationSettings;
  onChange: (newSettings: OptimizationSettings) => void;
  onReset: () => void;
  totalImages: number;
}

export function SettingsPanel({
  settings,
  onChange,
  onReset,
  totalImages,
}: SettingsPanelProps) {
  const [showSeoTip, setShowSeoTip] = useState(false);

  // Platform definitions with Naver Blog placed strictly at the TOP
  const platforms: {
    id: PlatformType;
    name: string;
    sublabel: string;
    badge?: string;
    ratios: { id: AspectRatioOption; label: string; desc: string }[];
  }[] = [
    {
      id: 'naver',
      name: '네이버 블로그',
      sublabel: '스마트에디터 ONE 추천 규격',
      badge: '추천/기본',
      ratios: [
        { id: '1:1', label: '1:1 정방형', desc: '네이버 대표 썸네일 공식 규격' },
        { id: '3:4', label: '3:4 세로형', desc: '모바일 뷰 최적화 (피드용)' },
        { id: '16:9', label: '16:9 와이드', desc: '본문 가로 사진/동영상 비율' },
        { id: 'free', label: '자유 비율', desc: '원하는 대로 직접 크롭' },
      ],
    },
    {
      id: 'tistory',
      name: '티스토리',
      sublabel: '카카오 블로그 썸네일 & 본문',
      ratios: [
        { id: '1:1', label: '1:1 정방형', desc: '피드/대표 썸네일' },
        { id: '16:9', label: '16:9 와이드', desc: '와이드 헤더 & 본문' },
        { id: 'free', label: '자유 비율', desc: '자유 크롭' },
      ],
    },
    {
      id: 'wordpress',
      name: '워드프레스',
      sublabel: '글로벌 테마 & Featured Image',
      ratios: [
        { id: '16:9', label: '16:9 와이드', desc: '특성 이미지 (Featured)' },
        { id: '4:3', label: '4:3 클래식', desc: '그리드 아카이브 뷰' },
        { id: 'free', label: '자유 비율', desc: '자유 크롭' },
      ],
    },
    {
      id: 'original',
      name: '원본 그대로 사용',
      sublabel: '비율 및 해상도 원본 유지 (크기만 최적화)',
      ratios: [
        { id: 'original', label: '원본 비율 유지', desc: '크롭 없이 용량만 압축' },
      ],
    },
  ];

  const currentPlatform = platforms.find((p) => p.id === settings.platform) || platforms[0];

  const handlePlatformChange = (pId: PlatformType) => {
    const targetP = platforms.find((p) => p.id === pId) || platforms[0];
    onChange({
      ...settings,
      platform: pId,
      selectedRatio: targetP.ratios[0].id,
    });
  };

  const handleRatioChange = (ratioId: AspectRatioOption) => {
    onChange({
      ...settings,
      selectedRatio: ratioId,
    });
  };

  return (
    <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
      {/* Header bar */}
      <div className="px-5 py-4 bg-zinc-50/80 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
            <Sliders className="w-4 h-4 text-zinc-200" />
          </div>
          <h2 className="text-base font-bold text-zinc-900">최적화 사전 설정</h2>
          <span className="text-xs text-zinc-500 font-normal">
            (업로드 및 개별 편집 시 기본값으로 일괄 적용됩니다)
          </span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-black bg-white hover:bg-zinc-100 rounded-lg border border-zinc-200 transition-colors"
          title="기본 설정으로 되돌리기"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          설정 초기화
        </button>
      </div>

      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. Platform & Ratio (Span 6) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <span>1. 플랫폼별 권장 비율</span>
              <span className="text-[10px] lowercase text-zinc-400">
                (네이버 블로그 최우선)
              </span>
            </label>
          </div>

          {/* Platform tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {platforms.map((p) => {
              const isSelected = settings.platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePlatformChange(p.id)}
                  className={`relative p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800'
                  }`}
                >
                  {p.badge && (
                    <span
                      className={`absolute -top-2 right-2 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-emerald-400 text-black' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.badge}
                    </span>
                  )}
                  <div className="text-xs font-bold leading-snug">{p.name}</div>
                  <div
                    className={`text-[10px] mt-0.5 line-clamp-1 ${
                      isSelected ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    {p.sublabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ratio choices for current platform */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-zinc-700 mb-2 flex items-center gap-1">
              <span>선택된 세부 비율:</span>
              <span className="font-bold text-black">{currentPlatform.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {currentPlatform.ratios.map((r) => {
                const isSelected = settings.selectedRatio === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRatioChange(r.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-black bg-zinc-900 text-white shadow-sm ring-2 ring-black/10'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{r.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p
                      className={`text-[10px] mt-1 line-clamp-1 ${
                        isSelected ? 'text-zinc-300' : 'text-zinc-500'
                      }`}
                    >
                      {r.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max Width restriction (Essential for Blog responsiveness) */}
          <div className="pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-700">
                최대 가로 너비 (해상도 리사이징)
              </label>
              <span className="text-[11px] text-zinc-500">
                {settings.maxWidthOption === 'original'
                  ? '원본 해상도 유지'
                  : `${settings.maxWidthOption}px 기준 비율 축소`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: '1200', label: '1200px', sub: '네이버 본문 최적' },
                { id: '1080', label: '1080px', sub: '인스타/피드' },
                { id: '1920', label: '1920px', sub: 'FHD 고해상도' },
                { id: 'original', label: '원본 크기', sub: '리사이즈 없음' },
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...settings,
                      maxWidthOption: w.id as any,
                    })
                  }
                  className={`py-1.5 px-2 rounded-lg text-center border text-xs transition-colors ${
                    settings.maxWidthOption === w.id
                      ? 'bg-black text-white border-black font-semibold'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
                  }`}
                >
                  <div>{w.label}</div>
                  <div className="text-[9px] opacity-75">{w.sub}</div>
                </button>
              ))}
            </div>

            {/* Centering option for smaller images */}
            {settings.maxWidthOption !== 'original' && (
              <div className="mt-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/90 text-left transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-900">
                        너비 미달 시 연한 회색 배경 가운데 배치
                      </span>
                      <span className="text-[10px] bg-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded font-semibold">
                        옵션
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-1 leading-relaxed">
                      지정 너비(<span className="font-semibold text-zinc-900">{settings.maxWidthOption}px</span>)보다 작은 이미지를 회색 배경 캔버스 중앙에 자동 정렬하여 블로그 가로 규격을 균일하게 맞춥니다.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={settings.padSmallImages}
                      onChange={(e) =>
                        onChange({
                          ...settings,
                          padSmallImages: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>

                {settings.padSmallImages && (
                  <div className="mt-2.5 pt-2.5 border-t border-zinc-200/70 flex items-center justify-between text-xs">
                    <span className="text-zinc-600 text-[11px]">배경 색상:</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { color: '#F4F4F5', label: '연한 회색 (기본)' },
                        { color: '#E4E4E7', label: '중간 회색' },
                        { color: '#FFFFFF', label: '화이트' },
                        { color: '#27272A', label: '다크' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => onChange({ ...settings, padColor: c.color })}
                          style={{ backgroundColor: c.color }}
                          className={`w-5 h-5 rounded-full border transition-all ${
                            settings.padColor === c.color
                              ? 'border-black ring-2 ring-black/20 scale-110'
                              : 'border-zinc-300 hover:scale-105'
                          }`}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. WebP Compression & Format (Span 3) */}
        <div className="lg:col-span-3 space-y-4 lg:border-l lg:border-zinc-200 lg:pl-6">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>2. WebP 변환 & 압축</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              구글/네이버 SEO 권장
            </span>
          </label>

          {/* Format selector */}
          <div>
            <div className="text-xs font-medium text-zinc-600 mb-1.5">출력 포맷</div>
            <div className="grid grid-cols-3 gap-1.5 bg-zinc-100 p-1 rounded-xl">
              {(['webp', 'jpeg', 'png'] as OutputFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => onChange({ ...settings, format: fmt })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all uppercase ${
                    settings.format === fmt
                      ? 'bg-white text-black shadow-sm'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  .{fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700">압축 품질 (Quality)</span>
              <span className="px-2 py-0.5 rounded-md bg-black text-white text-xs font-mono font-bold">
                {settings.quality}%
              </span>
            </div>

            <input
              type="range"
              min="20"
              max="100"
              step="1"
              value={settings.quality}
              onChange={(e) =>
                onChange({
                  ...settings,
                  quality: parseInt(e.target.value, 10),
                })
              }
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
            />

            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>최대 압축 (용량 최소)</span>
              <span className="text-zinc-700 font-semibold">권장: 80~85%</span>
              <span>무손실급 (고품질)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-zinc-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>WebP 포맷 이점</span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              JPG/PNG 대비 평균 <strong className="text-black">60~85% 용량 절감</strong>으로
              블로그 로딩 속도를 대폭 개선하며 검색엔진 SEO 점수가 상승합니다.
            </p>
          </div>
        </div>

        {/* 3. SEO Filename Batch Rule (Span 3) */}
        <div className="lg:col-span-3 space-y-4 lg:border-l lg:border-zinc-200 lg:pl-6">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
              <span>3. SEO 파일명 일괄 규칙</span>
            </label>
            <button
              type="button"
              onClick={() => setShowSeoTip(!showSeoTip)}
              className="text-zinc-400 hover:text-zinc-600"
              title="SEO 파일명 팁"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          {showSeoTip && (
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-800 leading-snug">
              검색엔진은 <code>IMG_1234.jpg</code> 대신 영문/한글 키워드가 포함된 하이픈 연결 파일명을
              이미지 검색 상위 노출에 선호합니다.
            </div>
          )}

          {/* Prefix input */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-700">파일명 접두사 (Keyword)</span>
            <input
              type="text"
              value={settings.filenamePrefix}
              onChange={(e) =>
                onChange({
                  ...settings,
                  filenamePrefix: e.target.value,
                })
              }
              placeholder="예: naver-blog-review"
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black bg-zinc-50 focus:bg-white"
            />
          </div>

          {/* Slugify toggle */}
          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={settings.slugify}
              onChange={(e) =>
                onChange({
                  ...settings,
                  slugify: e.target.checked,
                })
              }
              className="mt-0.5 rounded border-zinc-300 text-black focus:ring-black h-4 w-4 accent-black"
            />
            <div className="text-xs text-zinc-700 leading-tight">
              <span className="font-semibold">공백/특수문자 하이픈(-) 자동 변환 (Slugify)</span>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                URL 및 웹 표준에 맞게 공백을 <code>-</code>로 치환
              </p>
            </div>
          </label>

          {/* Live Filename Preview */}
          <div className="p-3 rounded-xl bg-zinc-900 text-zinc-100 text-xs space-y-1 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-sans font-semibold">
              생성 파일명 미리보기
            </div>
            <div className="truncate text-emerald-400 font-semibold">
              {settings.filenamePrefix || 'blog-image'}_01.{settings.format}
            </div>
            <div className="truncate text-zinc-400 text-[11px]">
              {settings.filenamePrefix || 'blog-image'}_02.{settings.format} ...
            </div>
          </div>
        </div>
      </div>

      {/* 4. Watermark Settings Section (Auto LocalStorage Persistent) */}
      <WatermarkSettings
        watermark={
          settings.watermark || {
            enabled: false,
            type: 'text',
            text: '© 부업하는 도도파파',
            textColor: '#FFFFFF',
            fontSize: 22,
            textBg: 'dark',
            imageDataUrl: null,
            position: 'bottom-right',
            opacity: 0.85,
            imageScale: 18,
          }
        }
        onChange={(newWatermark: WatermarkConfig) => {
          onChange({
            ...settings,
            watermark: newWatermark,
          });
        }}
        onDeleteWatermark={() => {
          try {
            localStorage.removeItem('blog_optimizer_watermark_settings_v1');
          } catch (e) {
            console.warn(e);
          }
          onChange({
            ...settings,
            watermark: {
              enabled: false,
              type: 'text',
              text: '',
              textColor: '#FFFFFF',
              fontSize: 22,
              textBg: 'dark',
              imageDataUrl: null,
              imageFileName: undefined,
              position: 'bottom-right',
              opacity: 0.85,
              imageScale: 18,
            },
          });
        }}
      />
    </section>
  );
}
