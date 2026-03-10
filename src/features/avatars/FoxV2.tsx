import { registerAvatar } from "./registry";

export function FoxV2Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--fox"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Ethereal Snow/Spirit Coat */}
        <radialGradient id="f2-body-snow" cx="45%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#E0F7FA" />
          <stop offset="100%" stopColor="#80DEEA" />
        </radialGradient>

        <radialGradient id="f2-belly-teal" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#EAF8FF" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#B2EBF2" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#00BCD4" stopOpacity="0.2" />
        </radialGradient>

        {/* Deep teal / ink shadows for ears */}
        <linearGradient id="f2-ear-points" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#4DD0E1" />
          <stop offset="50%" stopColor="#00838F" />
          <stop offset="100%" stopColor="#004D40" />
        </linearGradient>

        <linearGradient id="f2-ear-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E0F7FA" />
          <stop offset="100%" stopColor="#26C6DA" />
        </linearGradient>

        <radialGradient id="f2-eye-emerald" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#69F0AE" />
          <stop offset="50%" stopColor="#00E676" />
          <stop offset="100%" stopColor="#004D40" />
        </radialGradient>

        {/* Teal ink paws */}
        <radialGradient id="f2-paw-ink" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#004D40" />
          <stop offset="60%" stopColor="#00838F" />
          <stop offset="100%" stopColor="#4DD0E1" />
        </radialGradient>

        {/* Spirit Flame filter */}
        <filter id="f2-spirit-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComponentTransfer in="blur" result="glow">
            <feFuncA type="linear" slope="0.8" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="f2-drop-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="6" />
          <feComponentTransfer><feFuncA type="linear" slope="0.15" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="f2-soft-bevel" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#006064" floodOpacity="0.3" />
        </filter>
        
        {/* Third Eye Glow */}
        <radialGradient id="f2-third-eye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#18FFFF" />
          <stop offset="100%" stopColor="#00B8D4" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse className="tokki-shadow" cx="80" cy="144" rx="50" ry="12" fill="#0E2F33" opacity="0.8" />

      {/* Nine-Tails effect: multi layered ghostly tails */}
      {/* Back tail left */}
      <path className="tokki-tail" d="M 60 110 C -10 90 10 30 40 20 C 50 15 50 30 40 50 C 30 70 70 80 60 110 Z" fill="url(#f2-body-snow)" opacity="0.6" filter="url(#f2-spirit-glow)" />
      {/* Back tail right */}
      <path className="tokki-tail" d="M 100 110 C 170 90 150 30 120 20 C 110 15 110 30 120 50 C 130 70 90 80 100 110 Z" fill="url(#f2-body-snow)" opacity="0.6" filter="url(#f2-spirit-glow)" />
      {/* Main Center Tail */}
      <path
        className="tokki-tail"
        d="M 115 125 C 160 115 170 55 140 40 C 125 30 135 45 130 65 C 125 85 145 90 115 125 Z"
        fill="url(#f2-body-snow)"
        filter="url(#f2-drop-shadow)"
      />
      {/* Glowing tip */}
      <path d="M 140 40 C 125 30 125 40 130 65 C 133 40 150 40 140 40 Z" fill="#E0F7FA" filter="url(#f2-spirit-glow)" opacity="0.9" />

      {/* Main body block */}
      <ellipse className="tokki-body" cx="80" cy="110" rx="34" ry="28" fill="url(#f2-body-snow)" filter="url(#f2-drop-shadow)" />
      
      {/* Frosted Teal Belly */}
      <path d="M 48 116 Q 80 138 112 116 Q 105 85 80 90 Q 55 85 48 116 Z" fill="url(#f2-belly-teal)" />

      {/* Left Ear */}
      <g className="tokki-ear tokki-ear--left" filter="url(#f2-drop-shadow)">
        <path className="tokki-ear-shell" d="M 50 56 C 40 30 15 8 10 12 C 15 28 35 48 40 64 Z" fill="url(#f2-ear-points)" />
        <path className="tokki-ear-inner" d="M 44 54 C 35 35 22 20 20 22 C 25 32 38 48 38 56 Z" fill="url(#f2-ear-inner)" />
      </g>

      {/* Right Ear */}
      <g className="tokki-ear tokki-ear--right" filter="url(#f2-drop-shadow)">
        <path className="tokki-ear-shell" d="M 110 56 C 120 30 145 8 150 12 C 145 28 125 48 120 64 Z" fill="url(#f2-ear-points)" />
        <path className="tokki-ear-inner" d="M 116 54 C 125 35 138 20 140 22 C 135 32 122 48 122 56 Z" fill="url(#f2-ear-inner)" />
      </g>

      {/* Muzzle / Cheeks */}
      <path
        className="tokki-head"
        d="M 80 40 C 112 40 122 58 128 78 C 138 92 95 108 80 108 C 65 108 22 92 32 78 C 38 58 48 40 80 40 Z"
        fill="url(#f2-body-snow)"
        filter="url(#f2-drop-shadow)"
      />
      {/* Teal Cheek Fluff */}
      <path d="M 32 78 Q 25 95 58 98 Q 65 82 80 82 Q 95 82 102 98 Q 135 95 128 78 Q 115 105 80 108 Q 45 105 32 78 Z" fill="#E0F7FA" opacity="0.9" />

      {/* Glowing Third Eye / Spirit Mark on Forehead */}
      <path d="M 77 48 L 80 44 L 83 48 L 80 58 Z" fill="url(#f2-third-eye)" filter="url(#f2-spirit-glow)" />

      {/* Deep Emerald Spirit Eyes */}
      <g className="tokki-eye tokki-eye--left">
        <path d="M 45 74 Q 55 63 65 74 Q 55 78 45 74 Z" fill="url(#f2-eye-emerald)" stroke="#004D40" strokeWidth="1.5" />
        <ellipse cx="55" cy="74" rx="2.5" ry="5" fill="#004D40" />
        <circle cx="53" cy="71" r="2" fill="#FFFFFF" />
        <path d="M 40 74 Q 48 60 62 65" fill="none" stroke="#00838F" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <path d="M 115 74 Q 105 63 95 74 Q 105 78 115 74 Z" fill="url(#f2-eye-emerald)" stroke="#004D40" strokeWidth="1.5" />
        <ellipse cx="105" cy="74" rx="2.5" ry="5" fill="#004D40" />
        <circle cx="103" cy="71" r="2" fill="#FFFFFF" />
        <path d="M 120 74 Q 112 60 98 65" fill="none" stroke="#00838F" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Teal Nose */}
      <ellipse className="tokki-nose" cx="80" cy="85" rx="5" ry="3.5" fill="#006064" />
      <circle cx="78" cy="84" r="1.5" fill="#FFFFFF" opacity="0.8" />

      {/* Elegant, calm smile */}
      <path className="tokki-mouth" d="M 73 92 Q 76 96 80 93 Q 84 96 87 92" fill="none" stroke="#006064" strokeWidth="1.5" strokeLinecap="round" />

      {/* Whisker Whisps */}
      <g stroke="#00BCD4" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4" filter="url(#f2-spirit-glow)">
        <path d="M 25 84 Q 38 88 45 86" />
        <path d="M 22 92 Q 35 94 42 90" />
        
        <path d="M 135 84 Q 122 88 115 86" />
        <path d="M 138 92 Q 125 94 118 90" />
      </g>

      {/* Zzz overlay */}
      <g stroke="#26C6DA" strokeWidth="1.5" strokeDasharray="1 3" strokeLinecap="round" opacity="0.8">
        <circle className="tokki-snore tokki-snore--a" cx="120" cy="62" r="5.5" fill="none" />
        <circle className="tokki-snore tokki-snore--b" cx="130" cy="50" r="3.5" fill="none" />
      </g>
      <text className="tokki-zzz tokki-zzz--a" x="122" y="58" fontSize="13" fontWeight="900" fill="#00838F">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="132" y="44" fontSize="18" fontWeight="900" fill="#00838F">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="140" y="26" fontSize="24" fontWeight="900" fill="#00838F">Z</text>

      {/* Paws */}
      <ellipse className="tokki-paw tokki-paw--left" cx="64" cy="116" rx="11" ry="14" fill="url(#f2-paw-ink)" filter="url(#f2-soft-bevel)" />
      <ellipse className="tokki-paw tokki-paw--right" cx="96" cy="116" rx="11" ry="14" fill="url(#f2-paw-ink)" filter="url(#f2-soft-bevel)" />
      
      {/* Front Claws */}
      <path d="M 61 128 L 61 131 M 64 129 L 64 132 M 67 128 L 67 131" stroke="#004D40" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <path d="M 93 128 L 93 131 M 96 129 L 96 132 M 99 128 L 99 131" stroke="#004D40" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />

      {/* Back Paws */}
      <ellipse cx="58" cy="128" rx="15" ry="9" fill="url(#f2-paw-ink)" filter="url(#f2-soft-bevel)" />
      <ellipse cx="102" cy="128" rx="15" ry="9" fill="url(#f2-paw-ink)" filter="url(#f2-soft-bevel)" />

      {/* Floating Wisp Particles */}
      <circle cx="20" cy="50" r="3" fill="#80DEEA" filter="url(#f2-spirit-glow)" opacity="0.8">
        <animate attributeName="cy" values="50;40;50" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="145" cy="80" r="2" fill="#80DEEA" filter="url(#f2-spirit-glow)" opacity="0.6">
        <animate attributeName="cy" values="80;70;80" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default FoxV2Asset;

registerAvatar({
  id: "fox_v2",
  label: "Spirit Fox",
  emoji: "\u{1F98A}",
  cssClass: "tokki-asset--fox",
  accentColor: "#00BCD4",
  Component: FoxV2Asset,
  fx: {
    curious:   { particle: "wisp", count: [3, 6], zone: { x: [35, 125], y: [25, 85] }, intensity: 0.7 },
    surprised: { particle: "wisp", count: [5, 10], zone: { x: [20, 140], y: [10, 70] }, intensity: 1.0 },
    playful: { particle: "star", count: [2, 4], zone: { x: [40, 120], y: [20, 80] }, intensity: 0.5 },
  },
});

