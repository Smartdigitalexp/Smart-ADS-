import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className, size = 40 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Robot Body (Spherical) */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Main White Body */}
        <circle cx="50" cy="50" r="40" fill="white" />
        
        {/* Black Screen Face */}
        <rect x="23" y="28" width="54" height="44" rx="13" fill="#000000" />
        
        {/* Cyan Digital Eyes */}
        <path d="M34 52 H44 V45 A5 5 0 0 0 34 45 Z" fill="#00D1FF" className="animate-pulse" />
        <path d="M56 52 H66 V45 A5 5 0 0 0 56 45 Z" fill="#00D1FF" className="animate-pulse" />
        
        {/* Cyan Digital Smile */}
        <path
          d="M44 61C47 64 53 64 56 61"
          stroke="#00D1FF"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Lower Detail dot */}
        <circle cx="50" cy="82" r="2" fill="#333" />
      </svg>
    </div>
  );
};
