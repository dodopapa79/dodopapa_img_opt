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
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  Layers,
  RefreshCw,
  BookmarkPlus,
  FolderHeart,
  MousePointer,
  HelpCircle,
} from 'lucide-react';
import {
  ThumbnailRatio,
  ThumbnailBgType,
  ThumbnailTextLayer,
  OutputFormat,
  SavedThumbnailTemplate,
} from '../types';
import { downloadBlob, stripImageMetadata } from '../utils/imageProcessor';

const STORAGE_BG_IMAGE_KEY = 'blog_thumbnail_saved_bg_image_v3';
const STORAGE_TEMPLATES_KEY = 'blog_thumbnail_saved_templates_v2';
const MAX_TEMPLATES = 10;

interface GradientPreset {
  id: string;
  name: string;
  colors: [string, string];
}

const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'modern-dark', name: '모던 다크', colors: ['#18181B', '#09090B'] },
  { id: 'sunset', name: '선셋 오렌지', colors: ['#D97706', '#E11D48'] },
  { id: 'ocean', name: '딥 오션', colors: ['#1E3A8A', '#020617'] },
  { id: 'naver-clean', name: '네이버 그린', colors: ['#03C75A', '#065F46'] },
  { id: 'purple-night', name: '퍼플 나이트', colors: ['#581C87', '#09090B'] },
  { id: 'emerald-forest', name: '에메랄드', colors: ['#064E3B', '#022C22'] },
  { id: 'rose-gold', name: '로즈 와인', colors: ['#881337', '#18181B'] },
  { id: 'clean-soft', name: '소프트 크림', colors: ['#F4F4F5', '#E4E4E7'] },
];

const SOLID_PRESETS = [
  { label: '네이버 그린', color: '#03C75A' },
  { label: '비비드 레드', color: '#EF4444' },
  { label: '코발트 블루', color: '#2563EB' },
  { label: '선샤인 옐로우', color: '#FACC15' },
  { label: '에메랄드 그린', color: '#10B981' },
  { label: '앰버 오렌지', color: '#F97316' },
  { label: '바이올렛 퍼플', color: '#8B5CF6' },
  { label: '핫 핑크', color: '#EC4899' },
  { label: '스카이 블루', color: '#0284C7' },
  { label: '다크 블랙', color: '#09090B' },
  { label: '차콜 그레이', color: '#27272A' },
  { label: '크림 아이보리', color: '#FEF3C7' },
  { label: '소프트 화이트', color: '#FFFFFF' },
];

export const FONT_OPTIONS = [
  { id: 'Jua', label: '주아체 (Jua - 둥글둥글 귀여운 볼드)', font: '"Jua", sans-serif' },
  { id: 'Dongle', label: '동글체 (Dongle - 아기자기 동글동글)', font: '"Dongle", sans-serif' },
  { id: 'Do Hyeon', label: '도현체 (Do Hyeon - 둥근 고딕 헤드라인)', font: '"Do Hyeon", sans-serif' },
  { id: 'Gaegu', label: '개구체 (Gaegu - 통통 튀는 귀여운 손글씨)', font: '"Gaegu", cursive' },
  { id: 'Gamja Flower', label: '감자꽃체 (Gamja Flower - 둥글둥글 감성)', font: '"Gamja Flower", cursive' },
  { id: 'Hi Melody', label: '하이멜로디 (Hi Melody - 아기자기 귀여운 손글씨)', font: '"Hi Melody", cursive' },
  { id: 'Black Han Sans', label: '검은고딕 (Black Han Sans - 강렬한 볼드 헤드라인)', font: '"Black Han Sans", sans-serif' },
  { id: 'Gowun Dodum', label: '고운 돋움 (Gowun Dodum - 단정하고 부드러운 고딕)', font: '"Gowun Dodum", sans-serif' },
  { id: 'Gowun Batang', label: '고운 바탕 (Gowun Batang - 감성 에세이 명조)', font: '"Gowun Batang", serif' },
  { id: 'Nanum Pen Script', label: '나눔손글씨 (Nanum Pen Script - 친근한 손글씨)', font: '"Nanum Pen Script", cursive' },
  { id: 'Pretendard', label: '프리텐다드 (Pretendard - 모던 깔끔 산세리프)', font: 'Pretendard, -apple-system, sans-serif' },
  { id: 'Noto Sans KR', label: '노토산스 (Noto Sans KR - 정통 표준 고딕)', font: '"Noto Sans KR", sans-serif' },
];

interface StylePreset {
  id: string;
  name: string;
  fontBadge: string;
  description: string;
  texts: (ratio: ThumbnailRatio, w: number, h: number) => ThumbnailTextLayer[];
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'bold-headline',
    name: '강렬한 볼드 헤드라인',
    fontBadge: '검은고딕',
    description: '유튜브/네이버 최상단 노출에 최적화된 시선 집중형',
    texts: (_ratio, w, h) => [
      {
        id: 't-cat',
        text: '🔥 2026 실전 가이드',
        x: Math.round(w / 2),
        y: Math.round(h * 0.35),
        fontSize: Math.round(w * 0.04),
        baseFontSize: Math.round(1080 * 0.04),
        fontFamily: '"Black Han Sans", sans-serif',
        fontWeight: 'normal',
        color: '#FACC15',
        align: 'center',
        hasStroke: true,
        strokeColor: '#000000',
        strokeWidth: 4,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.85)',
        shadowBlur: 8,
        hasBadgeBg: true,
        badgeBgColor: 'rgba(0,0,0,0.7)',
        badgePadding: 16,
        badgeRadius: 8,
      },
      {
        id: 't-main',
        text: '클릭을 부르는\n핵심 비법 대공개',
        x: Math.round(w / 2),
        y: Math.round(h * 0.54),
        fontSize: Math.round(w * 0.082),
        baseFontSize: Math.round(1080 * 0.082),
        fontFamily: '"Black Han Sans", sans-serif',
        fontWeight: 'normal',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: true,
        strokeColor: '#000000',
        strokeWidth: 8,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.95)',
        shadowBlur: 16,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 12,
        badgeRadius: 10,
      },
      {
        id: 't-sub',
        text: '초보자도 5분 만에 따라하는 실전 요약',
        x: Math.round(w / 2),
        y: Math.round(h * 0.73),
        fontSize: Math.round(w * 0.042),
        baseFontSize: Math.round(1080 * 0.042),
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontWeight: 'bold',
        color: '#E4E4E7',
        align: 'center',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 4,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.85)',
        shadowBlur: 6,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 10,
        badgeRadius: 8,
      },
    ],
  },
  {
    id: 'emotion-essay',
    name: '감성 에세이 & 라이프',
    fontBadge: '고운바탕',
    description: '따뜻하고 우아한 분위기의 카페/여행/리뷰 썸네일',
    texts: (_ratio, w, h) => [
      {
        id: 't-cat',
        text: 'DAILY ESSAY & REVIEW',
        x: Math.round(w / 2),
        y: Math.round(h * 0.38),
        fontSize: Math.round(w * 0.034),
        baseFontSize: Math.round(1080 * 0.034),
        fontFamily: '"Gowun Batang", serif',
        fontWeight: 'bold',
        color: '#FDE047',
        align: 'center',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 3,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 6,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 12,
        badgeRadius: 6,
      },
      {
        id: 't-main',
        text: '따스한 온기가 머무는 곳\n나를 위한 특별한 기록',
        x: Math.round(w / 2),
        y: Math.round(h * 0.54),
        fontSize: Math.round(w * 0.068),
        baseFontSize: Math.round(1080 * 0.068),
        fontFamily: '"Gowun Batang", serif',
        fontWeight: 'bold',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: true,
        strokeColor: '#18181B',
        strokeWidth: 4,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 10,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 12,
        badgeRadius: 8,
      },
      {
        id: 't-sub',
        text: '잔잔한 일상 속 소소한 행복 이야기',
        x: Math.round(w / 2),
        y: Math.round(h * 0.71),
        fontSize: Math.round(w * 0.038),
        baseFontSize: Math.round(1080 * 0.038),
        fontFamily: '"Gowun Batang", serif',
        fontWeight: 'normal',
        color: '#FEF08A',
        align: 'center',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 3,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 6,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 10,
        badgeRadius: 6,
      },
    ],
  },
  {
    id: 'friendly-dodum',
    name: '단정하고 부드러운 정보글',
    fontBadge: '고운돋움',
    description: '가독성이 돋보이는 팁 및 생활 정보 가이드 스타일',
    texts: (_ratio, w, h) => [
      {
        id: 't-main',
        text: '알아두면 유용한\n생활 속 꿀팁 BEST 5',
        x: Math.round(w / 2),
        y: Math.round(h * 0.48),
        fontSize: Math.round(w * 0.07),
        baseFontSize: Math.round(1080 * 0.07),
        fontFamily: '"Gowun Dodum", sans-serif',
        fontWeight: 'bold',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: true,
        strokeColor: '#000000',
        strokeWidth: 5,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.85)',
        shadowBlur: 12,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 14,
        badgeRadius: 8,
      },
      {
        id: 't-sub',
        text: '지금 바로 적용할 수 있는 쉬운 방법들',
        x: Math.round(w / 2),
        y: Math.round(h * 0.66),
        fontSize: Math.round(w * 0.042),
        baseFontSize: Math.round(1080 * 0.042),
        fontFamily: '"Gowun Dodum", sans-serif',
        fontWeight: 'bold',
        color: '#67E8F9',
        align: 'center',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 3,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 8,
        hasBadgeBg: true,
        badgeBgColor: 'rgba(15,23,42,0.75)',
        badgePadding: 14,
        badgeRadius: 8,
      },
    ],
  },
  {
    id: 'cute-handwriting',
    name: '귀여운 손글씨 브이로그',
    fontBadge: '나눔손글씨',
    description: '친근하고 아기자기한 일상/요리/반려동물 포스팅용',
    texts: (_ratio, w, h) => [
      {
        id: 't-main',
        text: '우리집 댕댕이와의\n신나는 하루 브이로그 🐾',
        x: Math.round(w / 2),
        y: Math.round(h * 0.48),
        fontSize: Math.round(w * 0.095),
        baseFontSize: Math.round(1080 * 0.095),
        fontFamily: '"Nanum Pen Script", cursive',
        fontWeight: 'normal',
        color: '#FEF08A',
        align: 'center',
        hasStroke: true,
        strokeColor: '#18181B',
        strokeWidth: 5,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.85)',
        shadowBlur: 10,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 14,
        badgeRadius: 10,
      },
      {
        id: 't-sub',
        text: '행복 가득 귀여운 일상 엿보기',
        x: Math.round(w / 2),
        y: Math.round(h * 0.68),
        fontSize: Math.round(w * 0.065),
        baseFontSize: Math.round(1080 * 0.065),
        fontFamily: '"Nanum Pen Script", cursive',
        fontWeight: 'normal',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: true,
        strokeColor: '#18181B',
        strokeWidth: 4,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 6,
        hasBadgeBg: true,
        badgeBgColor: 'rgba(239, 68, 68, 0.85)',
        badgePadding: 16,
        badgeRadius: 12,
      },
    ],
  },
  {
    id: 'modern-tech',
    name: '모던 테크 & 비즈니스',
    fontBadge: 'Pretendard',
    description: '신뢰감을 주는 전문적인 IT/제품 리뷰/노하우 스타일',
    texts: (_ratio, w, h) => [
      {
        id: 't-cat',
        text: 'TECH & REVIEW',
        x: Math.round(w * 0.12),
        y: Math.round(h * 0.36),
        fontSize: Math.round(w * 0.038),
        baseFontSize: Math.round(1080 * 0.038),
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontWeight: 'bold',
        color: '#03C75A',
        align: 'left',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 4,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 6,
        hasBadgeBg: true,
        badgeBgColor: 'rgba(0,0,0,0.75)',
        badgePadding: 14,
        badgeRadius: 6,
      },
      {
        id: 't-main',
        text: '직접 써보고 분석한\n솔직 비교 사용기',
        x: Math.round(w * 0.12),
        y: Math.round(h * 0.54),
        fontSize: Math.round(w * 0.075),
        baseFontSize: Math.round(1080 * 0.075),
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontWeight: '900',
        color: '#FFFFFF',
        align: 'left',
        hasStroke: true,
        strokeColor: '#000000',
        strokeWidth: 6,
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
    fontBadge: 'Pretendard 볼드',
    description: '배경 사진과 완벽히 분리되는 확실한 시선 집중',
    texts: (_ratio, w, h) => [
      {
        id: 't-main',
        text: '📢 2026 필독 중요 공지',
        x: Math.round(w / 2),
        y: Math.round(h * 0.48),
        fontSize: Math.round(w * 0.068),
        baseFontSize: Math.round(1080 * 0.068),
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
        text: '놓치면 후회하는 핵심 업데이트 한눈에 보기',
        x: Math.round(w / 2),
        y: Math.round(h * 0.67),
        fontSize: Math.round(w * 0.04),
        baseFontSize: Math.round(1080 * 0.04),
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
  {
    id: 'cute-jua',
    name: '둥글둥글 주아체 (귀여운 볼드)',
    fontBadge: '주아체',
    description: '동글동글 통통 튀는 사랑스럽고 귀여운 분위기',
    texts: (_ratio, w, h) => [
      {
        id: 't-cat',
        text: '💖 오늘의 꿀정보',
        x: Math.round(w / 2),
        y: Math.round(h * 0.33),
        fontSize: Math.round(w * 0.046),
        baseFontSize: Math.round(1080 * 0.046),
        fontFamily: '"Jua", sans-serif',
        fontWeight: 'normal',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 0,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowBlur: 8,
        hasBadgeBg: true,
        badgeBgColor: '#EC4899',
        badgePadding: 16,
        badgeRadius: 20,
      },
      {
        id: 't-main',
        text: '놓치면 아쉬운!\n둥글둥글 꿀팁 대방출',
        x: Math.round(w / 2),
        y: Math.round(h * 0.52),
        fontSize: Math.round(w * 0.082),
        baseFontSize: Math.round(1080 * 0.082),
        fontFamily: '"Jua", sans-serif',
        fontWeight: 'normal',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: true,
        strokeColor: '#831843',
        strokeWidth: 6,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.6)',
        shadowBlur: 12,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 12,
        badgeRadius: 10,
      },
      {
        id: 't-sub',
        text: '초보자도 쉽게 따라할 수 있는 1분 핵심 정리 ✨',
        x: Math.round(w / 2),
        y: Math.round(h * 0.72),
        fontSize: Math.round(w * 0.042),
        baseFontSize: Math.round(1080 * 0.042),
        fontFamily: '"Jua", sans-serif',
        fontWeight: 'normal',
        color: '#FEF08A',
        align: 'center',
        hasStroke: true,
        strokeColor: '#000000',
        strokeWidth: 3,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 8,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 10,
        badgeRadius: 8,
      },
    ],
  },
  {
    id: 'cute-dongle',
    name: '동글동글 동글체 (아기자기 감성)',
    fontBadge: '동글체',
    description: '극강의 동글동글함과 아기자기한 다이어리/일상 감성',
    texts: (_ratio, w, h) => [
      {
        id: 't-cat',
        text: '🐰 일상 다이어리',
        x: Math.round(w / 2),
        y: Math.round(h * 0.32),
        fontSize: Math.round(w * 0.06),
        baseFontSize: Math.round(1080 * 0.06),
        fontFamily: '"Dongle", sans-serif',
        fontWeight: 'bold',
        color: '#18181B',
        align: 'center',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 0,
        hasShadow: false,
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowBlur: 6,
        hasBadgeBg: true,
        badgeBgColor: '#FEF08A',
        badgePadding: 20,
        badgeRadius: 24,
      },
      {
        id: 't-main',
        text: '동글동글 귀여운\n행복 가득한 하루 기록',
        x: Math.round(w / 2),
        y: Math.round(h * 0.52),
        fontSize: Math.round(w * 0.12),
        baseFontSize: Math.round(1080 * 0.12),
        fontFamily: '"Dongle", sans-serif',
        fontWeight: 'bold',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: true,
        strokeColor: '#18181B',
        strokeWidth: 6,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.7)',
        shadowBlur: 12,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 12,
        badgeRadius: 10,
      },
      {
        id: 't-sub',
        text: '소소하지만 확실한 나만의 힐링 모먼트 🌿',
        x: Math.round(w / 2),
        y: Math.round(h * 0.73),
        fontSize: Math.round(w * 0.065),
        baseFontSize: Math.round(1080 * 0.065),
        fontFamily: '"Dongle", sans-serif',
        fontWeight: 'normal',
        color: '#BAE6FD',
        align: 'center',
        hasStroke: true,
        strokeColor: '#000000',
        strokeWidth: 3,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 8,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 10,
        badgeRadius: 8,
      },
    ],
  },
  {
    id: 'cute-gamja',
    name: '감자꽃 손글씨 (포근한 동화풍)',
    fontBadge: '감자꽃체',
    description: '따뜻하고 동화 같은 손글씨로 편안한 감성 전달',
    texts: (_ratio, w, h) => [
      {
        id: 't-cat',
        text: '🧸 소소한 리뷰',
        x: Math.round(w / 2),
        y: Math.round(h * 0.34),
        fontSize: Math.round(w * 0.046),
        baseFontSize: Math.round(1080 * 0.046),
        fontFamily: '"Gamja Flower", cursive',
        fontWeight: 'normal',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: false,
        strokeColor: '#000000',
        strokeWidth: 0,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowBlur: 6,
        hasBadgeBg: true,
        badgeBgColor: '#10B981',
        badgePadding: 16,
        badgeRadius: 18,
      },
      {
        id: 't-main',
        text: '포근하고 따뜻한\n우리 집 감성 홈카페',
        x: Math.round(w / 2),
        y: Math.round(h * 0.53),
        fontSize: Math.round(w * 0.082),
        baseFontSize: Math.round(1080 * 0.082),
        fontFamily: '"Gamja Flower", cursive',
        fontWeight: 'normal',
        color: '#FFFFFF',
        align: 'center',
        hasStroke: true,
        strokeColor: '#064E3B',
        strokeWidth: 6,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 14,
        hasBadgeBg: false,
        badgeBgColor: 'rgba(0,0,0,0.5)',
        badgePadding: 12,
        badgeRadius: 10,
      },
      {
        id: 't-sub',
        text: '바쁜 일상 속 여유를 선물하는 소소한 힐링 ☕',
        x: Math.round(w / 2),
        y: Math.round(h * 0.72),
        fontSize: Math.round(w * 0.044),
        baseFontSize: Math.round(1080 * 0.044),
        fontFamily: '"Gamja Flower", cursive',
        fontWeight: 'normal',
        color: '#FEF3C7',
        align: 'center',
        hasStroke: true,
        strokeColor: '#000000',
        strokeWidth: 3,
        hasShadow: true,
        shadowColor: 'rgba(0,0,0,0.8)',
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
  const [solidColor, setSolidColor] = useState<string>('#03C75A');
  const [savedBgImage, setSavedBgImage] = useState<string | null>(null);
  const [dimOpacity, setDimOpacity] = useState<number>(0.35);
  const [downloadFormat, setDownloadFormat] = useState<OutputFormat>('webp');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Saved Templates (up to 10)
  const [savedTemplates, setSavedTemplates] = useState<SavedThumbnailTemplate[]>([]);
  const [templateSuccessNotice, setTemplateSuccessNotice] = useState<string | null>(null);

  // Snap feedback indicators
  const [isSnappingX, setIsSnappingX] = useState<boolean>(false);
  const [isSnappingY, setIsSnappingY] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

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
  const [activePresetId, setActivePresetId] = useState<string | null>(STYLE_PRESETS[0].id);
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

  // Load saved background image & templates from localStorage
  useEffect(() => {
    try {
      const savedImg = localStorage.getItem(STORAGE_BG_IMAGE_KEY);
      if (savedImg) {
        setSavedBgImage(savedImg);
        setBgType('image');
      }

      const savedTpls = localStorage.getItem(STORAGE_TEMPLATES_KEY);
      if (savedTpls) {
        setSavedTemplates(JSON.parse(savedTpls));
      }
    } catch (e) {
      console.warn('Failed to load saved thumbnail data from localStorage', e);
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

  // Upload background image & persist (guaranteeing 100% metadata/EXIF stripping)
  const handleUploadBgImage = async (file: File) => {
    try {
      const stripped = await stripImageMetadata(file);
      const result = stripped.cleanDataUrl;
      setSavedBgImage(result);
      setBgType('image');
      try {
        localStorage.setItem(STORAGE_BG_IMAGE_KEY, result);
      } catch (err) {
        console.warn('Storage quota exceeded or error saving image to localStorage', err);
      }
    } catch (err) {
      console.error('Failed to strip metadata from thumbnail background:', err);
    }
  };

  // Remove saved background image
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

  // Switch ratio without degrading text size (누적 축소 버그 완전 해결)
  const handleRatioChange = (newRatio: ThumbnailRatio) => {
    const oldSize = getCanvasSize(ratio);
    const newSize = getCanvasSize(newRatio);
    setRatio(newRatio);

    // 1:1 기준 1.0, 16:9 기준 0.72, 4:3 기준 0.86의 정규화 폰트 스케일 적용
    const getRatioFontScale = (r: ThumbnailRatio) => {
      if (r === '1:1') return 1.0;
      if (r === '16:9') return 0.72;
      return 0.86;
    };

    const targetFontScale = getRatioFontScale(newRatio);

    setTexts((prev) =>
      prev.map((t) => {
        const baseSize = t.baseFontSize || t.fontSize;
        const nextX = Math.round((t.x / oldSize.width) * newSize.width);
        const nextY = Math.round((t.y / oldSize.height) * newSize.height);
        const nextFontSize = Math.max(18, Math.round(baseSize * targetFontScale));

        return {
          ...t,
          baseFontSize: baseSize,
          x: nextX,
          y: nextY,
          fontSize: nextFontSize,
        };
      })
    );
  };

  // Apply style preset (with automatic web font loading & instant canvas re-render)
  const handleApplyPreset = (preset: StylePreset) => {
    const size = getCanvasSize(ratio);
    const newTexts = preset.texts(ratio, size.width, size.height);
    setActivePresetId(preset.id);
    setTexts(newTexts);
    setSelectedTextId(null);

    // 0ms Synchronous draw to canvas immediately with newTexts
    renderCanvas(newTexts);

    // Preload all fonts used in the preset and re-render canvas immediately as soon as fonts are ready
    if (typeof document !== 'undefined' && 'fonts' in document) {
      const fontPromises = newTexts.map((t) => {
        const family = t.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
        return document.fonts.load(`${t.fontWeight || 'normal'} ${t.fontSize}px "${family}"`).catch(() => {});
      });

      Promise.all(fontPromises).then(() => {
        renderCanvas(newTexts);
      });

      // Quick fallback re-renders for network font fetch latency
      requestAnimationFrame(() => renderCanvas(newTexts));
      setTimeout(() => renderCanvas(newTexts), 40);
      setTimeout(() => renderCanvas(newTexts), 120);
      setTimeout(() => renderCanvas(newTexts), 300);
    }
  };

  // Reset all thumbnail configurations back to clean defaults
  const handleResetAll = () => {
    const defaultRatio: ThumbnailRatio = '1:1';
    const defaultSize = getCanvasSize(defaultRatio);
    const defaultTexts = STYLE_PRESETS[0].texts(defaultRatio, defaultSize.width, defaultSize.height);

    setRatio(defaultRatio);
    setBgType('gradient');
    setGradientId('modern-dark');
    setSolidColor('#03C75A');
    setDimOpacity(0.35);
    setTexts(defaultTexts);
    setSelectedTextId(null);
    setActivePresetId(STYLE_PRESETS[0].id);

    renderCanvas({
      ratio: defaultRatio,
      bgType: 'gradient',
      gradientId: 'modern-dark',
      solidColor: '#03C75A',
      dimOpacity: 0.35,
      texts: defaultTexts,
    });

    setTemplateSuccessNotice('썸네일 설정과 텍스트가 초기 기본값으로 깨끗하게 리셋되었습니다.');
    setTimeout(() => setTemplateSuccessNotice(null), 3000);
  };

  // Add new text layer
  const handleAddTextLayer = () => {
    const size = getCanvasSize(ratio);
    const baseSize = Math.round(1080 * 0.055);
    const fontScale = ratio === '1:1' ? 1.0 : ratio === '16:9' ? 0.72 : 0.86;

    const newLayer: ThumbnailTextLayer = {
      id: `text-${Date.now()}`,
      text: '새로운 텍스트 문구',
      x: Math.round(size.width / 2),
      y: Math.round(size.height * 0.5),
      fontSize: Math.round(baseSize * fontScale),
      baseFontSize: baseSize,
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
      prev.map((t) => {
        if (t.id === selectedTextId) {
          const updated = { ...t, ...patch };
          if (patch.fontSize !== undefined) {
            // 현재 비율 기준에서 1:1 baseFontSize 역산 보존
            const scale = ratio === '1:1' ? 1.0 : ratio === '16:9' ? 0.72 : 0.86;
            updated.baseFontSize = Math.round(patch.fontSize / scale);
          }
          return updated;
        }
        return t;
      })
    );

    if (patch.fontFamily && typeof document !== 'undefined' && 'fonts' in document) {
      const family = patch.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
      document.fonts.load(`32px "${family}"`).then(() => {
        renderCanvas();
      }).catch(() => {});
      setTimeout(() => renderCanvas(), 80);
    }
  };

  // Delete selected text layer
  const handleDeleteSelectedText = () => {
    if (!selectedTextId) return;
    setTexts((prev) => prev.filter((t) => t.id !== selectedTextId));
    setSelectedTextId(null);
  };

  // -------------------------------------------------------------
  // Template Management (Save up to 10 locally & Load & Delete)
  // -------------------------------------------------------------
  const handleSaveCurrentTemplate = () => {
    if (savedTemplates.length >= MAX_TEMPLATES) {
      alert(`템플릿은 최대 ${MAX_TEMPLATES}개까지 저장할 수 있습니다. 불필요한 템플릿을 삭제 후 다시 시도해주세요.`);
      return;
    }

    const firstLine = texts[0]?.text.split('\n')[0].trim() || '이름 없는 썸네일';
    const cleanTitle = firstLine.length > 15 ? `${firstLine.substring(0, 15)}...` : firstLine;
    const templateName = `${cleanTitle} (${ratio})`;

    const newTpl: SavedThumbnailTemplate = {
      id: `tpl-${Date.now()}`,
      name: templateName,
      savedAt: new Date().toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      ratio,
      bgType,
      gradientId,
      solidColor,
      dimOpacity,
      texts: JSON.parse(JSON.stringify(texts)),
    };

    const updated = [newTpl, ...savedTemplates].slice(0, MAX_TEMPLATES);
    setSavedTemplates(updated);
    try {
      localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(updated));
      setTemplateSuccessNotice(`'${templateName}' 템플릿이 성공적으로 저장되었습니다!`);
      setTimeout(() => setTemplateSuccessNotice(null), 3000);
    } catch (err) {
      console.warn('Failed to save templates to localStorage', err);
    }
  };

  const handleApplySavedTemplate = (tpl: SavedThumbnailTemplate) => {
    setRatio(tpl.ratio);
    setBgType(tpl.bgType);
    setGradientId(tpl.gradientId);
    setSolidColor(tpl.solidColor);
    setDimOpacity(tpl.dimOpacity);
    setTexts(JSON.parse(JSON.stringify(tpl.texts)));
    setSelectedTextId(null);

    if (typeof document !== 'undefined' && 'fonts' in document) {
      const fontPromises = tpl.texts.map((t) => {
        const family = t.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
        return document.fonts.load(`${t.fontWeight || 'normal'} ${t.fontSize}px "${family}"`).catch(() => {});
      });
      Promise.all(fontPromises).then(() => {
        renderCanvas();
      });
      setTimeout(() => renderCanvas(), 80);
      setTimeout(() => renderCanvas(), 250);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    try {
      localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to update templates in localStorage', err);
    }
  };

  // -------------------------------------------------------------
  // Canvas Rendering Logic with Interactive Selection Bounding Box & Snap Lines
  // -------------------------------------------------------------
  const renderCanvas = useCallback((overrides?: ThumbnailTextLayer[] | {
    texts?: ThumbnailTextLayer[];
    bgType?: ThumbnailBgType;
    gradientId?: string;
    solidColor?: string;
    dimOpacity?: number;
    ratio?: ThumbnailRatio;
  }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let targetTexts = texts;
    let targetBgType = bgType;
    let targetGradientId = gradientId;
    let targetSolidColor = solidColor;
    let targetDimOpacity = dimOpacity;
    let targetDims = canvasDims;

    if (Array.isArray(overrides)) {
      targetTexts = overrides;
    } else if (overrides) {
      if (overrides.texts) targetTexts = overrides.texts;
      if (overrides.bgType) targetBgType = overrides.bgType;
      if (overrides.gradientId) targetGradientId = overrides.gradientId;
      if (overrides.solidColor) targetSolidColor = overrides.solidColor;
      if (overrides.dimOpacity !== undefined) targetDimOpacity = overrides.dimOpacity;
      if (overrides.ratio) targetDims = getCanvasSize(overrides.ratio);
    }

    const { width, height } = targetDims;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background
    if (targetBgType === 'image' && bgImgElementRef.current) {
      const img = bgImgElementRef.current;
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

      if (targetDimOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${targetDimOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }
    } else if (targetBgType === 'solid') {
      ctx.fillStyle = targetSolidColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      const preset = GRADIENT_PRESETS.find((g) => g.id === targetGradientId) || GRADIENT_PRESETS[0];
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, preset.colors[0]);
      grad.addColorStop(1, preset.colors[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw Text Layers
    targetTexts.forEach((layer) => {
      if (!layer.text.trim()) return;

      ctx.save();
      ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
      ctx.textAlign = layer.align;
      ctx.textBaseline = 'middle';

      const lines = layer.text.split('\n');
      const lineHeight = layer.fontSize * 1.25;
      const totalTextHeight = lines.length * lineHeight;

      let maxLineWidth = 0;
      lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > maxLineWidth) maxLineWidth = w;
      });

      // Calculate Bounding Box coordinates
      const padX = layer.hasBadgeBg ? layer.badgePadding * 1.5 : 12;
      const padY = layer.hasBadgeBg ? layer.badgePadding : 10;
      const boxW = maxLineWidth + padX * 2;
      const boxH = totalTextHeight + padY * 2;

      let boxX = layer.x - boxW / 2;
      if (layer.align === 'left') boxX = layer.x - padX;
      if (layer.align === 'right') boxX = layer.x - boxW + padX;

      const boxY = layer.y - boxH / 2;

      // Draw Badge Background if active
      if (layer.hasBadgeBg) {
        ctx.fillStyle = layer.badgeBgColor;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxW, boxH, layer.badgeRadius);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
      }

      // Draw Text lines
      const startY = layer.y - (totalTextHeight / 2) + (lineHeight / 2);

      lines.forEach((line, idx) => {
        const lineY = startY + idx * lineHeight;

        if (layer.hasShadow) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = Math.round(layer.shadowBlur * 0.25);
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        if (layer.hasStroke && layer.strokeWidth > 0) {
          ctx.strokeStyle = layer.strokeColor;
          ctx.lineWidth = layer.strokeWidth;
          ctx.lineJoin = 'round';
          ctx.strokeText(line, layer.x, lineY);
        }

        ctx.fillStyle = layer.color;
        ctx.fillText(line, layer.x, lineY);
      });

      // 3. If this layer is SELECTED: Draw Object Bounding Box & Handles ("잡고 움직이는 느낌")
      if (layer.id === selectedTextId && !isExporting) {
        ctx.restore();
        ctx.save();

        const selPad = 8;
        const selX = boxX - selPad;
        const selY = boxY - selPad;
        const selW = boxW + selPad * 2;
        const selH = boxH + selPad * 2;

        // Semi-transparent highlight tint
        ctx.fillStyle = isDragging ? 'rgba(59, 130, 246, 0.14)' : 'rgba(59, 130, 246, 0.08)';
        ctx.fillRect(selX, selY, selW, selH);

        // Dashed Selection Box Border
        ctx.strokeStyle = isDragging ? '#2563EB' : '#3B82F6';
        ctx.lineWidth = 2.5;
        ctx.setLineDash(isDragging ? [6, 4] : [4, 4]);
        ctx.strokeRect(selX, selY, selW, selH);

        // Corner & Midpoint Point Handles
        const handleSize = 8;
        const handleColor = '#2563EB';
        const handleBorder = '#FFFFFF';
        ctx.setLineDash([]);

        const points = [
          { x: selX, y: selY }, // Top-Left
          { x: selX + selW, y: selY }, // Top-Right
          { x: selX, y: selY + selH }, // Bottom-Left
          { x: selX + selW, y: selY + selH }, // Bottom-Right
          { x: selX + selW / 2, y: selY }, // Top-Center
          { x: selX + selW / 2, y: selY + selH }, // Bottom-Center
          { x: selX, y: selY + selH / 2 }, // Left-Center
          { x: selX + selW, y: selY + selH / 2 }, // Right-Center
        ];

        points.forEach((pt) => {
          ctx.fillStyle = handleColor;
          ctx.fillRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
          ctx.strokeStyle = handleBorder;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
        });

        // Small tooltip tag above bounding box
        ctx.fillStyle = '#2563EB';
        const tagText = isDragging ? '이동 중 (자석 스냅 활성)' : '드래그하여 이동';
        ctx.font = 'bold 14px sans-serif';
        const tagW = ctx.measureText(tagText).width + 16;
        const tagH = 24;
        const tagX = selX + selW / 2 - tagW / 2;
        const tagY = selY - tagH - 6;

        if (tagY > 0) {
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(tagX, tagY, tagW, tagH, 6);
            ctx.fill();
          } else {
            ctx.fillRect(tagX, tagY, tagW, tagH);
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tagText, selX + selW / 2, tagY + tagH / 2);
        }
      }

      ctx.restore();
    });

    // 4. Draw Snap Guidelines (수직선 / 수평선 자석 정렬 가이드)
    if (!isExporting) {
      if (isSnappingX) {
        ctx.save();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        // Center Indicator diamond
        ctx.fillStyle = '#EF4444';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (isSnappingY) {
        ctx.save();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }, [canvasDims, bgType, gradientId, solidColor, dimOpacity, texts, selectedTextId, isDragging, isSnappingX, isSnappingY, isExporting]);

  // Preload all custom Korean fonts on mount so canvas renders them instantly without clicking
  useEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      const fontsToWarmUp = [
        'normal 32px "Jua"',
        'normal 32px "Dongle"',
        'bold 32px "Dongle"',
        'normal 32px "Gamja Flower"',
        'normal 32px "Do Hyeon"',
        'bold 32px "Gaegu"',
        'normal 32px "Hi Melody"',
        'normal 32px "Black Han Sans"',
        'normal 32px "Gowun Dodum"',
        'normal 32px "Gowun Batang"',
        'normal 32px "Nanum Pen Script"',
        'normal 32px Pretendard',
      ];

      Promise.all(fontsToWarmUp.map((f) => document.fonts.load(f).catch(() => {}))).then(() => {
        renderCanvas();
      });

      document.fonts.ready.then(() => {
        renderCanvas();
      });
    }
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        renderCanvas();
      });
    }
  }, [renderCanvas]);

  // -------------------------------------------------------------
  // Mouse Drag to Move Text Layer with Smart Magnet Snap
  // -------------------------------------------------------------
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasDims.width / rect.width;
    const scaleY = canvasDims.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

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

      const halfW = maxLineWidth / 2 + 25;
      const halfH = totalHeight / 2 + 20;

      let cx = layer.x;
      if (layer.align === 'left') cx = layer.x + halfW - 25;
      if (layer.align === 'right') cx = layer.x - halfW + 25;

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
      setIsDragging(true);
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
      setIsDragging(false);
      setIsSnappingX(false);
      setIsSnappingY(false);
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

      let newX = Math.round(dragRef.current.startX + deltaX);
      let newY = Math.round(dragRef.current.startY + deltaY);

      // Smart Magnet Snap Guidelines (중앙 수직/수평선 스냅)
      const centerX = Math.round(canvasDims.width / 2);
      const centerY = Math.round(canvasDims.height / 2);
      const snapThreshold = 22; // px

      let snappedX = false;
      let snappedY = false;

      // X Snap: Center
      if (Math.abs(newX - centerX) <= snapThreshold) {
        newX = centerX;
        snappedX = true;
      }

      // Y Snap: Center
      if (Math.abs(newY - centerY) <= snapThreshold) {
        newY = centerY;
        snappedY = true;
      }

      setIsSnappingX(snappedX);
      setIsSnappingY(snappedY);

      setTexts((prev) =>
        prev.map((t) =>
          t.id === dragRef.current?.id ? { ...t, x: newX, y: newY } : t
        )
      );
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      setIsDragging(false);
      setIsSnappingX(false);
      setIsSnappingY(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasDims]);

  // -------------------------------------------------------------
  // Export High-Quality Thumbnail
  // -------------------------------------------------------------
  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);

    try {
      // 렌더링 시 테두리나 가이드라인이 들어가지 않도록 잠시 대기
      setTimeout(() => {
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
      }, 50);
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
                스마트 스튜디오
              </span>
            </h2>
            <p className="text-xs text-zinc-500">
              비율 전환 시 글자 크기 보존 · 자석 정렬 가이드 · 무료 폰트 프리셋 · 템플릿 로컬 보관함
            </p>
          </div>
        </div>

        {/* Ratio Selector Buttons & Reset Button */}
        <div className="flex items-center gap-2 flex-wrap">
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

          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-zinc-700 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="모든 설정을 초기 기본 상태로 되돌립니다"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-500 hover:text-rose-500" />
            <span>설정 초기화</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Canvas Preview, Right Controls (우측 스크롤 제거) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
        {/* Left: Canvas Stage */}
        <div className="lg:col-span-7 xl:col-span-8 p-4 sm:p-6 bg-zinc-100/80 flex flex-col items-center justify-center min-h-[500px] relative">
          {/* Canvas Wrapper */}
          <div className="relative shadow-2xl rounded-xl overflow-hidden border border-zinc-300 max-w-full">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              className={`block max-h-[62vh] max-w-full w-auto h-auto select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-crosshair'
              }`}
              title="텍스트를 클릭하여 선택하고 마우스로 자유롭게 이동하세요"
            />

            {/* Smart Snap & Drag guide banner */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/65 text-white text-[11px] px-2.5 py-1 rounded-md backdrop-blur-xs pointer-events-none select-none">
              <MousePointer className="w-3 h-3 text-amber-400" />
              <span>텍스트를 마우스로 드래그하면 수직/수평선에 자석처럼 스냅됩니다</span>
            </div>

            {(isSnappingX || isSnappingY) && (
              <div className="absolute top-2 right-2 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-md animate-pulse pointer-events-none">
                {isSnappingX && isSnappingY ? '정중앙 교차 스냅!' : isSnappingX ? '가로 중앙 스냅' : '세로 중앙 스냅'}
              </div>
            )}
          </div>

          {/* Quick presets row with font badges & Quick Reset */}
          <div className="mt-4 flex items-center flex-wrap justify-center gap-2 max-w-3xl">
            <span className="text-xs font-bold text-zinc-600 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
              폰트 느낌별 프리셋:
            </span>
            {STYLE_PRESETS.map((p) => {
              const isSelected = activePresetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent blur event from active input from canceling the single click!
                    e.preventDefault();
                    handleApplyPreset(p);
                  }}
                  onClick={() => handleApplyPreset(p)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900 ring-2 ring-zinc-900/30 shadow-xs'
                      : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                  }`}
                  title={p.description}
                >
                  <span>{p.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                      isSelected
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {p.fontBadge}
                  </span>
                </button>
              );
            })}
            <div className="h-4 w-[1px] bg-zinc-300 mx-0.5 hidden sm:block" />
            <button
              type="button"
              onClick={handleResetAll}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 border border-zinc-200 text-xs font-semibold text-zinc-600 shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="썸네일 텍스트와 설정을 초기 기본값으로 리셋"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>초기화</span>
            </button>
          </div>
        </div>

        {/* Right: Controls & Properties Panel (내부 스크롤 제거하여 쾌적하게 사용) */}
        <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-5 flex flex-col gap-5">
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

            {/* Case 2: Solid Colors (적색, 파랑, 녹색, 노랑 등 풍성한 원색/비비드 지원) */}
            {bgType === 'solid' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-7 gap-1.5">
                  {SOLID_PRESETS.map((s) => (
                    <button
                      key={s.color}
                      type="button"
                      onClick={() => setSolidColor(s.color)}
                      className={`h-7 rounded-lg border transition-transform relative ${
                        solidColor === s.color
                          ? 'ring-2 ring-black scale-108 shadow-xs z-10'
                          : 'border-zinc-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: s.color }}
                      title={s.label}
                    />
                  ))}
                  {/* Custom color input */}
                  <label
                    className="h-7 rounded-lg border border-dashed border-zinc-300 flex items-center justify-center cursor-pointer hover:border-zinc-500 overflow-hidden"
                    title="직접 커스텀 색상 선택"
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
                      설정된 사진은 로컬에 자동 보관되며, GPS/카메라 메타정보(EXIF)는 100% 자동 소거됩니다
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
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
                  <span className="text-xs font-bold text-zinc-800">선택된 텍스트 편집</span>
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

                {/* Font Family Selector */}
                <div>
                  <div className="text-[11px] text-zinc-500 mb-1 font-medium">폰트 서체 스타일</div>
                  <select
                    value={selectedText.fontFamily}
                    onChange={(e) => updateSelectedText({ fontFamily: e.target.value })}
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.font}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size & Weight & Color */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                      <span>글자 크기</span>
                      <span className="font-mono">{selectedText.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="130"
                      step="2"
                      value={selectedText.fontSize}
                      onChange={(e) => updateSelectedText({ fontSize: parseInt(e.target.value, 10) })}
                      className="w-full accent-black cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] text-zinc-500 mb-1">글자 색상</div>
                    <div className="flex items-center gap-1">
                      {['#FFFFFF', '#FACC15', '#EF4444', '#60A5FA', '#34D399', '#000000'].map((col) => (
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

                {/* Alignment buttons & Snap to Center button */}
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

                  <button
                    type="button"
                    onClick={() => {
                      const size = getCanvasSize(ratio);
                      updateSelectedText({ x: Math.round(size.width / 2) });
                    }}
                    className="ml-auto text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    가로 정중앙 맞춤
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
                      <span className="text-[10px] text-zinc-400 font-mono">가독성 극대화</span>
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
                위 목록에서 텍스트를 선택하거나 캔버스에서 직접 클릭하면 파란색 조절 박스가 나타나며 서식(폰트, 외곽선, 그림자 등)을 조절할 수 있습니다.
              </div>
            )}
          </div>

          {/* 3. Export & Template Save Bar */}
          <div className="pt-3 border-t border-zinc-200 mt-auto space-y-2.5">
            <div className="flex items-center justify-between gap-2">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveCurrentTemplate}
                className="py-2.5 px-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="현재 썸네일 설정을 로컬 보관함에 저장 (최대 10개)"
              >
                <BookmarkPlus className="w-4 h-4 text-blue-600" />
                <span>현재 디자인 템플릿 저장</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="py-2.5 px-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>{isExporting ? '고화질 생성 중...' : `썸네일 다운로드 (${downloadFormat.toUpperCase()})`}</span>
              </button>
            </div>

            {templateSuccessNotice && (
              <div className="text-center text-xs font-semibold text-emerald-600 bg-emerald-50 py-1.5 rounded-lg">
                {templateSuccessNotice}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Saved Templates Drawer (최대 10개 로컬 보관함) */}
      <div className="border-t border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderHeart className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-zinc-900">내 썸네일 템플릿 보관함</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 font-semibold">
              {savedTemplates.length} / {MAX_TEMPLATES}개
            </span>
          </div>
          <p className="text-xs text-zinc-400 hidden sm:block">
            자주 쓰는 디자인을 저장해두고 언제든 원클릭으로 다시 불러올 수 있습니다
          </p>
        </div>

        {savedTemplates.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-zinc-300 text-center text-xs text-zinc-400 bg-white/50">
            아직 저장된 템플릿이 없습니다. 마음에 드는 디자인을 완성한 뒤 우측 하단의 <strong className="text-zinc-600">[현재 디자인 템플릿 저장]</strong> 버튼을 누르면 여기에 최대 10개까지 보관됩니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {savedTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white rounded-xl border border-zinc-200 p-3 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                      {tpl.ratio}
                    </span>
                    <span className="text-[10px] text-zinc-400">{tpl.savedAt}</span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-800 truncate" title={tpl.name}>
                    {tpl.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                    {tpl.texts[0]?.text.split('\n')[0] || '텍스트 없음'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => handleApplySavedTemplate(tpl)}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition-colors text-center"
                  >
                    불러오기
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                    title="이 템플릿 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden Font Preloader to force browser to immediately download all woff2 font files */}
      <div
        aria-hidden="true"
        className="fixed -top-[9999px] -left-[9999px] opacity-0 pointer-events-none select-none overflow-hidden h-0 w-0"
      >
        <span style={{ fontFamily: '"Jua", sans-serif' }}>주아체 폰트 로드 123 ABC</span>
        <span style={{ fontFamily: '"Dongle", sans-serif' }}>동글체 폰트 로드 123 ABC</span>
        <span style={{ fontFamily: '"Gamja Flower", cursive' }}>감자꽃체 폰트 로드 123 ABC</span>
        <span style={{ fontFamily: '"Do Hyeon", sans-serif' }}>도현체 폰트 로드 123 ABC</span>
        <span style={{ fontFamily: '"Gaegu", cursive' }}>개구체 폰트 로드 123 ABC</span>
        <span style={{ fontFamily: '"Hi Melody", cursive' }}>하이멜로디 폰트 로드 123 ABC</span>
        <span style={{ fontFamily: '"Black Han Sans", sans-serif' }}>검은고딕 폰트 로드 123 ABC</span>
        <span style={{ fontFamily: '"Gowun Dodum", sans-serif' }}>고운돋움 폰트 로드 123 ABC</span>
        <span style={{ fontFamily: '"Gowun Batang", serif' }}>고운바탕 폰트 로드 123 ABC</span>
        <span style={{ fontFamily: '"Nanum Pen Script", cursive' }}>나눔손글씨 폰트 로드 123 ABC</span>
      </div>
    </div>
  );
}
