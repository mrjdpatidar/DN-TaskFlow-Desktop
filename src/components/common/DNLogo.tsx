import React from 'react';

// Exact vector geometry extracted from official DN brand mark
export const DN_PATH_D =
  'M 133,140 L 108,103 L 106,103 L 104,110 L 98,121 L 91,129 L 78,138 L 66,142 L 5,142 L 4,143 L 2,143 L 2,147 L 5,154 L 9,169 L 11,172 L 13,181 L 16,185 L 62,185 L 80,182 L 92,178 L 102,173 L 115,164 L 127,152 L 133,144 Z M 2,1 L 3,128 L 42,128 L 42,47 L 45,43 L 50,42 L 62,42 L 68,43 L 74,45 L 85,51 L 97,63 L 177,184 L 179,185 L 220,185 L 222,183 L 222,3 L 221,1 L 181,2 L 180,114 L 129,37 L 115,22 L 104,14 L 88,6 L 68,1 Z';

interface DNLogoProps {
  variant?: 'mark' | 'full' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const DNLogo: React.FC<DNLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
}) => {
  // Dimension mappings
  const heightMap = {
    xs: 18,
    sm: 24,
    md: 32,
    lg: 44,
    xl: 60,
  };

  const h = heightMap[size];

  if (variant === 'mark') {
    // Aspect ratio of DN mark is 224 / 187 ≈ 1.2
    const w = Math.round(h * 1.2);
    return (
      <svg
        viewBox="0 0 224 187"
        width={w}
        height={h}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
      >
        <defs>
          <linearGradient id="dnLogoBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0096fa" />
            <stop offset="50%" stopColor="#0080fa" />
            <stop offset="100%" stopColor="#1070fa" />
          </linearGradient>
        </defs>
        <path d={DN_PATH_D} fill="url(#dnLogoBlue)" fillRule="evenodd" />
      </svg>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        className={`rounded-xl bg-[#0080fa]/10 dark:bg-[#0080fa]/20 border border-[#0080fa]/30 flex items-center justify-center p-1.5 shadow-xs shrink-0 ${className}`}
        style={{ width: h * 1.2, height: h * 1.2 }}
      >
        <svg
          viewBox="0 0 224 187"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="dnBadgeBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0096fa" />
              <stop offset="50%" stopColor="#0080fa" />
              <stop offset="100%" stopColor="#1070fa" />
            </linearGradient>
          </defs>
          <path d={DN_PATH_D} fill="url(#dnBadgeBlue)" fillRule="evenodd" />
        </svg>
      </div>
    );
  }

  // Full Brand Lockup: DN + TASK + FL + [O with task checkmark] + W
  // Scaled viewbox 680 x 140 -> aspect ratio 680 / 140 ≈ 4.85
  const fullWidth = Math.round(h * 4.85);

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg
        viewBox="0 0 680 140"
        width={fullWidth}
        height={h}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="dnFullGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0096fa" />
            <stop offset="50%" stopColor="#0080fa" />
            <stop offset="100%" stopColor="#1070fa" />
          </linearGradient>
        </defs>

        {/* 1. Conjoined DN Glyph */}
        <g transform="translate(15, 22) scale(0.51)">
          <path d={DN_PATH_D} fill="url(#dnFullGrad)" fillRule="evenodd" />
        </g>

        {/* 2. TASK */}
        <text
          x="145"
          y="94"
          fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="78"
          fontWeight="900"
          letterSpacing="-1.5"
          className="fill-slate-900 dark:fill-white transition-colors"
        >
          TASK
        </text>

        {/* 3. FL */}
        <text
          x="390"
          y="94"
          fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="78"
          fontWeight="900"
          letterSpacing="-1.5"
          className="fill-slate-900 dark:fill-white transition-colors"
        >
          FL
        </text>

        {/* 4. O - Circular TaskFlow Badge (matching DNPOS circular emblem) */}
        <g transform="translate(508, 64)">
          <circle
            cx="0"
            cy="0"
            r="34"
            className="fill-slate-900 dark:fill-white transition-colors"
          />
          {/* Checkmark inside O */}
          <path
            d="M-13 1 L-4 10 L14 -8"
            className="stroke-white dark:stroke-[#0b0f19] transition-colors"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>

        {/* 5. W */}
        <text
          x="554"
          y="94"
          fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="78"
          fontWeight="900"
          letterSpacing="-1.5"
          className="fill-slate-900 dark:fill-white transition-colors"
        >
          W
        </text>
      </svg>
    </div>
  );
};

/**
 * Organization Avatar / Logo component
 * Completely replaces old emojis (🏢, ⚡) with clean letter badges or custom logos.
 */
interface OrgLogoProps {
  name?: string;
  logo?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const OrgLogo: React.FC<OrgLogoProps> = ({
  name = 'Workspace',
  logo,
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  // If custom valid image URL (not an old emoji)
  const isImage =
    logo && (logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('data:image/'));

  if (isImage) {
    return (
      <img
        src={logo}
        alt={name}
        className={`rounded-lg object-cover shrink-0 border border-black/10 dark:border-white/10 ${sizeMap[size]} ${className}`}
      />
    );
  }

  // Generate 2-letter uppercase initials from name
  const cleanName = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : (cleanName.slice(0, 2) || 'TF').toUpperCase();

  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-[#0080fa] to-[#0055d4] text-white font-bold flex items-center justify-center shrink-0 shadow-xs ring-1 ring-white/20 select-none ${sizeMap[size]} ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
};

