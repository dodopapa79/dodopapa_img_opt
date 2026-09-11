export type PlatformType = 'naver' | 'tistory' | 'wordpress' | 'original';

export type AspectRatioOption = 'free' | '1:1' | '3:4' | '16:9' | '4:3' | 'original';

export interface PlatformPreset {
  id: PlatformType;
  name: string;
  badge: string;
  description: string;
  ratios: {
    id: AspectRatioOption;
    label: string;
    description: string;
    aspect?: number; // width / height
  }[];
}

export type OutputFormat = 'webp' | 'jpeg' | 'png';

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface WatermarkConfig {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  textColor: string; // e.g. '#FFFFFF'
  fontSize: number; // e.g. 22
  textBg: 'none' | 'dark' | 'light';
  imageDataUrl: string | null;
  imageFileName?: string;
  position: WatermarkPosition;
  opacity: number; // 0.1 to 1.0
  imageScale: number; // 10 to 40 (%)
}

export interface OptimizationSettings {
  platform: PlatformType;
  selectedRatio: AspectRatioOption;
  format: OutputFormat;
  quality: number; // 1 to 100
  maxWidthOption: 'original' | '1200' | '900' | '600' | '1920' | '1080' | '800';
  padSmallImages: boolean; // 옵션: 가로너비 미달 시 연한 회색 배경 위에 가운데 배치
  padColor: string; // 여백 채우기 배경색 (기본 '#F4F4F5' 연한 회색)
  filenamePrefix: string;
  slugify: boolean;
  numberPadding: number; // e.g. 2 -> 01, 02
  startNumber: number; // e.g. 1
  watermark: WatermarkConfig;
}

// -------------------------------------------------------------
// Blog Thumbnail Maker Types
// -------------------------------------------------------------
export type ThumbnailRatio = '1:1' | '16:9' | '4:3';

export type ThumbnailBgType = 'image' | 'solid' | 'gradient';

export interface ThumbnailTextLayer {
  id: string;
  text: string;
  x: number; // 0 to canvasWidth
  y: number; // 0 to canvasHeight
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | '900';
  color: string;
  align: 'left' | 'center' | 'right';
  // Border (Stroke)
  hasStroke: boolean;
  strokeColor: string;
  strokeWidth: number;
  // Shadow
  hasShadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  // Highlight Box (Badge background)
  hasBadgeBg: boolean;
  badgeBgColor: string;
  badgePadding: number;
  badgeRadius: number;
}

export interface ThumbnailConfig {
  ratio: ThumbnailRatio;
  bgType: ThumbnailBgType;
  bgImage: string | null; // dataURL or null (persisted in localStorage)
  bgImageDimOpacity: number; // 0 (none) to 0.8 (dim dark overlay)
  solidColor: string;
  gradientPreset: string; // e.g. 'sunset', 'ocean', 'dark', 'purple', 'mint'
  texts: ThumbnailTextLayer[];
  format: OutputFormat;
}

export interface OptimizedImageItem {
  id: string;
  originalFile: File;
  originalName: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  originalDataUrl: string;

  // Edited/Processed state
  currentDataUrl: string; // The active canvas data URL (after crop/draw/mosaic)
  optimizedBlob: Blob | null;
  optimizedDataUrl: string | null;
  optimizedSize: number;
  optimizedWidth: number;
  optimizedHeight: number;
  optimizedFilename: string;
  savingsPercent: number;

  isProcessing: boolean;
  hasCustomEdits: boolean;
}

export type EditorTool = 'select' | 'crop' | 'arrow' | 'callout' | 'text' | 'mosaic';

export interface ArrowAnnotation {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  length: number;
  angleDeg: number;
}

export interface CalloutAnnotation {
  id: string;
  text: string;
  boxX: number;
  boxY: number;
  targetX: number;
  targetY: number;
  fontSize: number;
  textColor: string;
  bgColor: string; // translucent light gray: rgba(243, 244, 246, 0.88)
  borderColor: string;
  arrowColor: string;
  arrowWidth: number;
}

export interface TextAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bgColor: 'dark' | 'light' | 'yellow' | 'none';
}

export type EditorArrow = ArrowAnnotation;
export type EditorCallout = CalloutAnnotation;
export type EditorText = TextAnnotation;

export interface EditorMosaic {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  blockSize: number;
}

export interface EditorStateSnapshot {
  imageDataUrl: string;
  arrows: EditorArrow[];
  texts: EditorText[];
  mosaics: EditorMosaic[];
}
