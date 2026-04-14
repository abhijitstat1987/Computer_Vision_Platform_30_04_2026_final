import React from 'react';

interface LogoProps {
  size?: number;
  variant?: 'icon' | 'full' | 'compact';
  className?: string;
}

/**
 * Custom Industrial AI Vision Platform logo.
 * A hexagonal eye/lens motif representing machine vision + industrial strength.
 */
export function IndustrialAILogo({ size = 32, variant = 'icon', className = '' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Hexagonal outer frame */}
        <path
          d="M20 2L36.66 11.5V30.5L20 40L3.34 30.5V11.5L20 2Z"
          fill="url(#logo-grad)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="0.5"
        />
        {/* Inner camera/eye aperture blades */}
        <path d="M20 10L26 14V22L20 26L14 22V14L20 10Z" fill="rgba(255,255,255,0.15)" />
        <path d="M20 13L24 15.5V20.5L20 23L16 20.5V15.5L20 13Z" fill="rgba(255,255,255,0.1)" />
        {/* Central lens dot */}
        <circle cx="20" cy="18" r="4.5" fill="rgba(255,255,255,0.9)" />
        <circle cx="20" cy="18" r="2.5" fill="url(#lens-grad)" />
        {/* Scanning line accent */}
        <rect x="11" y="28" width="18" height="1.5" rx="0.75" fill="rgba(56,189,248,0.8)" />
        <rect x="14" y="31" width="12" height="1" rx="0.5" fill="rgba(56,189,248,0.4)" />
        {/* AI neural dots */}
        <circle cx="12" cy="12" r="1" fill="rgba(56,189,248,0.6)" />
        <circle cx="28" cy="12" r="1" fill="rgba(56,189,248,0.6)" />
        <circle cx="8" cy="20" r="0.8" fill="rgba(56,189,248,0.4)" />
        <circle cx="32" cy="20" r="0.8" fill="rgba(56,189,248,0.4)" />
        <defs>
          <linearGradient id="logo-grad" x1="3" y1="2" x2="37" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f172a" />
            <stop offset="0.5" stopColor="#1e3a5f" />
            <stop offset="1" stopColor="#0c1929" />
          </linearGradient>
          <radialGradient id="lens-grad" cx="20" cy="18" r="2.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0284c7" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  // Full or compact — icon + text
  const textSize = variant === 'full' ? 'text-sm' : 'text-xs';
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IndustrialAILogo size={size} variant="icon" />
      <div className="flex flex-col leading-none">
        <span className={`${textSize} font-bold text-white tracking-tight`}>Industrial AI</span>
        {variant === 'full' && (
          <span className="text-[10px] text-sky-300 tracking-wide font-medium">Vision Platform</span>
        )}
      </div>
    </div>
  );
}
