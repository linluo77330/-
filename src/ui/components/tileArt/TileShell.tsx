import type { ReactNode } from 'react';
import { MJ } from './colors';

interface TileShellProps {
  uid: string;
  children: ReactNode;
}

/** 立体 ivory 牌体 + 内框 */
export function TileShell({ uid, children }: TileShellProps) {
  return (
    <>
      <defs>
        <linearGradient id={`body-${uid}`} x1="0%" y1="0%" x2="15%" y2="100%">
          <stop offset="0%" stopColor="#FFFEF9" />
          <stop offset="35%" stopColor={MJ.ivory} />
          <stop offset="100%" stopColor={MJ.ivoryDark} />
        </linearGradient>
        <linearGradient id={`side-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B8A888" />
          <stop offset="100%" stopColor="#8A7858" />
        </linearGradient>
        <filter id={`emboss-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.3" floodColor={MJ.black} floodOpacity="0.35" />
        </filter>
      </defs>

      <path d="M52 6 L56 10 L56 74 L52 78 L52 6" fill={`url(#side-${uid})`} />
      <path d="M6 74 L52 78 L56 74 L10 70 Z" fill="#9A8868" opacity="0.85" />
      <rect x="2" y="2" width="52" height="76" rx="5" ry="5" fill={`url(#side-${uid})`} />
      <rect x="4" y="4" width="48" height="72" rx="4" ry="4" fill={`url(#body-${uid})`} />
      <rect
        x="8"
        y="8"
        width="40"
        height="64"
        rx="2"
        ry="2"
        fill="none"
        stroke={MJ.ivoryEdge}
        strokeWidth="0.8"
        opacity="0.65"
      />
      <rect x="10" y="10" width="36" height="60" rx="1.5" fill="#FAF6EC" opacity="0.5" />
      <g filter={`url(#emboss-${uid})`}>{children}</g>
    </>
  );
}

interface TileBackShellProps {
  uid: string;
}

export function TileBackShell({ uid }: TileBackShellProps) {
  return (
    <>
      <defs>
        <linearGradient id={`bk-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3A9A6A" />
          <stop offset="50%" stopColor="#2A6844" />
          <stop offset="100%" stopColor="#1E5035" />
        </linearGradient>
        <pattern id={`pat-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#2A6844" />
          <path d="M0 3 L3 0 L6 3 L3 6 Z" fill="none" stroke="#4DA870" strokeWidth="0.35" opacity="0.5" />
        </pattern>
      </defs>
      <path d="M52 6 L56 10 L56 74 L52 78 L52 6" fill="#1A4030" />
      <path d="M6 74 L52 78 L56 74 L10 70 Z" fill="#153528" />
      <rect x="2" y="2" width="52" height="76" rx="5" fill="#1A4030" />
      <rect x="4" y="4" width="48" height="72" rx="4" fill={`url(#bk-${uid})`} />
      <rect x="8" y="8" width="40" height="64" rx="2" fill={`url(#pat-${uid})`} opacity="0.85" />
      <rect
        x="16"
        y="22"
        width="24"
        height="24"
        rx="2"
        transform="rotate(45 28 34)"
        fill="none"
        stroke="#6BC492"
        strokeWidth="1.5"
        opacity="0.75"
      />
      <circle cx="28" cy="34" r="4.5" fill="#6BC492" opacity="0.5" />
    </>
  );
}
