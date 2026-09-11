import { ExternalLink } from 'lucide-react';
import profileLogo from '../assets/images/main_profile_logo_1789007287441.jpg';

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            id="header-logo-image"
            src={profileLogo || '/profile-logo.png'}
            alt="도도파파 로고"
            className="w-10 h-10 rounded-xl object-cover border border-zinc-200 shadow-sm bg-white ring-1 ring-black/5 flex-shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-900 tracking-tight">
                블로그 이미지 최적화도구
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200">
                SEO & WebP Studio
              </span>
            </div>
            <p className="text-xs text-zinc-500 hidden md:block">
              클라이언트 100% 프라이빗 변환 · GPS/EXIF 메타데이터 100% 소거 · 무손실급 WebP 압축
            </p>
          </div>
        </div>

        {/* User Request: Header Button with link to blog */}
        <div className="flex items-center gap-3">
          <a
            id="btn-header-blog-link"
            href="https://blog.naver.com/lonnie79"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white hover:bg-zinc-800 active:scale-95 transition-all text-sm font-medium shadow-sm border border-zinc-800"
            title="부업하는 도도파파 네이버 블로그 새 탭 방문"
          >
            <span>부업하는 도도파파</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>
    </header>
  );
}
