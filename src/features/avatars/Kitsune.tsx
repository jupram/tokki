import { registerAvatar } from "./registry";

export function KitsuneAsset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--kitsune"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Deep Mystical Ruby/Amber gradient */}
        <radialGradient id="kt-body-fire" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFEEB3" />
          <stop offset="30%" stopColor="#FF6B4A" />
          <stop offset="70%" stopColor="#D91627" />
          <stop offset="100%" stopColor="#4A0512" />
        </radialGradient>

        {/* Ethereal underbelly / mask */}
        <radialGradient id="kt-belly-gold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#FFF1B8" />
          <stop offset="100%" stopColor="#FFC859" stopOpacity="0.2" />
        </radialGradient>

        {/* Multi-layered ink wash magic tails */}
        <linearGradient id="kt-tail-grad" x1="0.1" y1="0.8" x2="0.9" y2="0.1">
          <stop offset="0%" stopColor="#FF2A40" />
          <stop offset="40%" stopColor="#FF6B4A" />
          <stop offset="80%" stopColor="#FFB347" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        
        <linearGradient id="kt-tail-shadow" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#8A0B1A" />
          <stop offset="50%" stopColor="#D91627" />
          <stop offset="100%" stopColor="#FFA64D" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="kt-ear-tips" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0"/>
          <stop offset="60%" stopColor="#D91627" />
          <stop offset="100%" stopColor="#4A0512" />
        </linearGradient>

        <radialGradient id="kt-eye-ruby" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFCAD4" />
          <stop offset="40%" stopColor="#FF2A40" />
          <stop offset="100%" stopColor="#660011" />
        </radialGradient>

        <radialGradient id="kt-spirit-orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#FFEDB3" />
          <stop offset="80%" stopColor="#FF4A4A" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FF4A4A" stopOpacity="0" />
        </radialGradient>

        <filter id="kt-god-radiance" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComponentTransfer in="blur" result="glow">
            <feFuncA type="linear" slope="1.2" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="kt-drop-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" />
          <feOffset dx="0" dy="8" />
          <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        <filter id="kt-soft-bevel" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#8A0B1A" floodOpacity="0.4" />
        </filter>
      </defs>

      <ellipse className="tokki-shadow" cx="80" cy="146" rx="55" ry="14" fill="#2E040B" filter="blur(6px)" opacity="0.9" />

      {/* Massive array of mystical tails fanning out */}
      <g filter="url(#kt-god-radiance)" opacity="0.6">
        <path d="M 60 110 C -10 80 -20 20 20 10 C 30 5 35 25 30 50 C 25 70 70 80 60 110 Z" fill="url(#kt-tail-shadow)" />
        <path d="M 100 110 C 170 80 180 20 140 10 C 130 5 125 25 130 50 C 135 70 90 80 100 110 Z" fill="url(#kt-tail-shadow)" />
      </g>
      
      {/* Mid Tails */}
      <path className="tokki-tail tokki-tail--a" d="M 70 120 C 10 100 0 40 40 25 C 55 20 50 40 45 65 C 40 90 80 95 70 120 Z" fill="url(#kt-tail-grad)" filter="url(#kt-drop-shadow)" />
      <path className="tokki-tail tokki-tail--b" d="M 90 120 C 150 100 160 40 120 25 C 105 20 110 40 115 65 C 120 90 80 95 90 120 Z" fill="url(#kt-tail-grad)" filter="url(#kt-drop-shadow)" />

      {/* Main Center Tail */}
      <path className="tokki-tail tokki-tail--c" d="M 110 130 C 160 105 170 45 135 30 C 120 20 125 40 120 65 C 115 90 145 95 110 130 Z" fill="url(#kt-tail-grad)" filter="url(#kt-drop-shadow)" />
      <path d="M 135 30 C 120 20 115 35 120 65 C 128 35 150 35 135 30 Z" fill="#FFFFFF" opacity="0.9" filter="blur(2px)" />

      {/* Main Squishy Body */}
      <ellipse className="tokki-body" cx="80" cy="112" rx="36" ry="30" fill="url(#kt-body-fire)" filter="url(#kt-drop-shadow)" />
      
      {/* Glowing Belly */}
      <path d="M 46 116 Q 80 144 114 116 Q 105 85 80 90 Q 55 85 46 116 Z" fill="url(#kt-belly-gold)" filter="url(#kt-soft-bevel)" />

      {/* Kitsune Ears (Tall, sharp, painted tips) */}
      <g className="tokki-ear tokki-ear--left" filter="url(#kt-drop-shadow)">
        <path className="tokki-ear-shell" d="M 50 56 C 40 25 15 5 10 10 C 20 25 35 48 40 64 Z" fill="url(#kt-body-fire)" />
        <path d="M 50 56 C 40 25 15 5 10 10 C 20 25 35 48 40 64 Z" fill="url(#kt-ear-tips)" />
        <path className="tokki-ear-inner" d="M 44 54 C 35 35 22 18 20 20 C 25 30 38 48 38 56 Z" fill="#FFC859" opacity="0.8" />
        {/* Kabuki Ear Ribbons */}
        <path d="M 20 25 Q 30 35 40 32" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" />
      </g>
      <g className="tokki-ear tokki-ear--right" filter="url(#kt-drop-shadow)">
        <path className="tokki-ear-shell" d="M 110 56 C 120 25 145 5 150 10 C 140 25 125 48 120 64 Z" fill="url(#kt-body-fire)" />
        <path d="M 110 56 C 120 25 145 5 150 10 C 140 25 125 48 120 64 Z" fill="url(#kt-ear-tips)" />
        <path className="tokki-ear-inner" d="M 116 54 C 125 35 138 18 140 20 C 135 30 122 48 122 56 Z" fill="#FFC859" opacity="0.8" />
        <path d="M 140 25 Q 130 35 120 32" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" />
      </g>

      {/* Fluffy Head */}
      <path
        className="tokki-head"
        d="M 80 40 C 112 40 122 62 128 82 C 138 98 95 112 80 112 C 65 112 22 98 32 82 C 38 62 48 40 80 40 Z"
        fill="url(#kt-body-fire)"
        filter="url(#kt-drop-shadow)"
      />
      {/* White Fox Mask (Muzzle + Cheeks) */}
      <path d="M 80 50 Q 110 55 122 82 Q 130 100 110 108 Q 95 105 80 112 Q 65 105 50 108 Q 30 100 38 82 Q 50 55 80 50 Z" fill="url(#kt-belly-gold)" opacity="0.95" filter="url(#kt-soft-bevel)" />
      
      {/* Traditional Kitsune Markings (Kabuki Red) */}
      {/* Forehead Jewel/Mark */}
      <path d="M 75 42 Q 80 32 85 42 L 80 55 Z" fill="#D91627" filter="url(#kt-soft-bevel)" />
      <circle cx="80" cy="46" r="2" fill="#FFFFFF" />
      
      {/* Eye swoops */}
      <path d="M 40 70 Q 30 60 25 50" fill="none" stroke="#D91627" strokeWidth="3" strokeLinecap="round" filter="url(#kt-soft-bevel)" />
      <path d="M 120 70 Q 130 60 135 50" fill="none" stroke="#D91627" strokeWidth="3" strokeLinecap="round" filter="url(#kt-soft-bevel)" />
      <path d="M 50 82 Q 40 85 35 95" fill="none" stroke="#D91627" strokeWidth="2" strokeLinecap="round" filter="url(#kt-soft-bevel)" />
      <path d="M 110 82 Q 120 85 125 95" fill="none" stroke="#D91627" strokeWidth="2" strokeLinecap="round" filter="url(#kt-soft-bevel)" />

      {/* Eyes */}
      <g className="tokki-eye tokki-eye--left">
        <path d="M 45 74 Q 55 64 65 74 Q 55 78 45 74 Z" fill="url(#kt-eye-ruby)" stroke="#4A0512" strokeWidth="2" />
        <ellipse cx="55" cy="74" rx="2" ry="5" fill="#2E040B" />
        <circle cx="53" cy="71" r="1.5" fill="#FFFFFF" />
        <path d="M 40 74 Q 50 60 62 65" fill="none" stroke="#2E040B" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <path d="M 115 74 Q 105 64 95 74 Q 105 78 115 74 Z" fill="url(#kt-eye-ruby)" stroke="#4A0512" strokeWidth="2" />
        <ellipse cx="105" cy="74" rx="2" ry="5" fill="#2E040B" />
        <circle cx="103" cy="71" r="1.5" fill="#FFFFFF" />
        <path d="M 120 74 Q 110 60 98 65" fill="none" stroke="#2E040B" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      <ellipse className="tokki-nose" cx="80" cy="88" rx="6" ry="4" fill="#2E040B" />
      <ellipse cx="78" cy="87" rx="1.5" ry="1" fill="#FFFFFF" opacity="0.6" transform="rotate(-15 78 87)" />

      <path className="tokki-mouth" d="M 73 95 Q 76 99 80 95 Q 84 99 87 95" fill="none" stroke="#2E040B" strokeWidth="1.8" strokeLinecap="round" />

      {/* Spirit Foxfire Orbs floating around */}
      <g className="tokki-foxfire" filter="url(#kt-god-radiance)">
        <circle cx="25" cy="40" r="10" fill="url(#kt-spirit-orb)" />
        <circle cx="25" cy="40" r="3" fill="#FFFFFF" />
        <circle cx="135" cy="85" r="8" fill="url(#kt-spirit-orb)" />
        <circle cx="135" cy="85" r="2.5" fill="#FFFFFF" />
      </g>

      {/* Zzz overlay */}
      <g stroke="#FFB347" strokeWidth="1.5" strokeDasharray="1 3" strokeLinecap="round" opacity="0.9">
        <circle className="tokki-snore tokki-snore--a" cx="120" cy="62" r="5.5" fill="none" />
        <circle className="tokki-snore tokki-snore--b" cx="130" cy="50" r="3.5" fill="none" />
      </g>
      <text className="tokki-zzz tokki-zzz--a" x="122" y="58" fontSize="13" fontWeight="900" fill="#D91627">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="132" y="44" fontSize="18" fontWeight="900" fill="#D91627">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="140" y="26" fontSize="24" fontWeight="900" fill="#D91627">Z</text>

      {/* Front Paws dipped in blood red/ink */}
      <ellipse className="tokki-paw tokki-paw--left" cx="62" cy="118" rx="12" ry="15" fill="#4A0512" filter="url(#kt-soft-bevel)" />
      <ellipse className="tokki-paw tokki-paw--right" cx="98" cy="118" rx="12" ry="15" fill="#4A0512" filter="url(#kt-soft-bevel)" />
      <path d="M 58 130 L 58 133 M 62 131 L 62 134 M 66 130 L 66 133" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <path d="M 94 130 L 94 133 M 98 131 L 98 134 M 102 130 L 102 133" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />

      {/* Back Paws */}
      <ellipse cx="56" cy="132" rx="16" ry="10" fill="#4A0512" filter="url(#kt-soft-bevel)" />
      <ellipse cx="104" cy="132" rx="16" ry="10" fill="#4A0512" filter="url(#kt-soft-bevel)" />

      <path d="M 50 115 Q 80 128 110 115" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.6" filter="blur(1px)" />

    </svg>
  );
}

export default KitsuneAsset;

registerAvatar({
  id: "kitsune_v1",
  label: "Kitsune",
  emoji: "\u{1F98A}",
  cssClass: "tokki-asset--kitsune",
  accentColor: "#FF2A40",
  Component: KitsuneAsset,
  fx: {
    curious: { particle: "wisp", count: [3, 6], zone: { x: [20, 140], y: [10, 70] }, intensity: 0.8 },
    playful: { particle: "star", count: [4, 8], zone: { x: [10, 150], y: [0, 80] }, intensity: 0.9 },
  },
});
