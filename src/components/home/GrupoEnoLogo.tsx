import React from 'react';

const DEFAULT_LOGO_URL = '/logo.jpg?v=3';

interface GrupoEnoLogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export function GrupoEnoLogo({ variant = 'dark', size = 'md' }: GrupoEnoLogoProps) {
  const badgeSize = size === 'sm' ? 'h-9' : size === 'lg' ? 'h-14' : 'h-11';

  return (
    <div className="relative flex items-center gap-3 select-none">
      <div className={`relative ${badgeSize} shrink-0 flex items-center justify-center`}>
        <img
          src={DEFAULT_LOGO_URL}
          alt="Grupo ENO Logo"
          className="h-full w-auto max-w-[180px] object-contain object-left drop-shadow-md"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
