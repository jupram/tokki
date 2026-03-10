import { registerAvatar } from "./registry";

export function PenguinAsset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--penguin"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Soft, plump baby penguin body */}
        <radialGradient id="pg-body-navy" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#2A3859" />
          <stop offset="40%" stopColor="#1E2843" />
          <stop offset="85%" stopColor="#0B101D" />
          <stop offset="100%" stopColor="#05080F" />
        </radialGradient>

        <radialGradient id="pg-belly-snow" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#E6F0FA" />
          <stop offset="100%" stopColor="#A3C2E0" />
        </radialGradient>

        <radialGradient id="pg-face-snow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="80%" stopColor="#E6F0FA" />
          <stop offset="100%" stopColor="#304469" stopOpacity="0.2" />
        </radialGradient>

        {/* Cute squishy beak */}
        <linearGradient id="pg-beak-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFEA8C" />
          <stop offset="50%" stopColor="#FFC233" />
          <stop offset="100%" stopColor="#F58B00" />
        </linearGradient>

        <linearGradient id="pg-feet-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC233" />
          <stop offset="100%" stopColor="#CC7300" />
        </linearGradient>

        {/* Thick cozy red knit scarf */}
        <linearGradient id="pg-scarf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F74343" />
          <stop offset="50%" stopColor="#D62B2B" />
          <stop offset="100%" stopColor="#8A1313" />
        </linearGradient>

        {/* Blush / Cheek */}
        <radialGradient id="pg-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF85A2" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FF85A2" stopOpacity="0" />
        </radialGradient>

        <filter id="pg-drop-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="5" />
          <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="pg-soft-bevel" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.3" />
        </filter>

        <filter id="pg-inner-shadow">
          <feOffset dx="0" dy="-4"/>
          <feGaussianBlur stdDeviation="3" result="offset-blur"/>
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
          <feFlood floodColor="black" floodOpacity="0.5" result="color"/>
          <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
          <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
        </filter>
      </defs>

      <ellipse className="tokki-shadow" cx="80" cy="146" rx="42" ry="12" fill="#0B1324" opacity="0.6" filter="blur(4px)" />

      {/* Chunky Feet */}
      <g filter="url(#pg-drop-shadow)">
        <path d="M 52 135 C 45 135 40 142 42 146 C 45 150 65 150 68 146 C 70 142 65 135 52 135 Z" fill="url(#pg-feet-grad)" />
        <path d="M 108 135 C 115 135 120 142 118 146 C 115 150 95 150 92 146 C 90 142 95 135 108 135 Z" fill="url(#pg-feet-grad)" />
        {/* Webbed toes */}
        <path d="M 48 148 L 48 143 M 56 148 L 56 144 M 64 148 L 64 145" stroke="#A35A00" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <path d="M 112 148 L 112 143 M 104 148 L 104 144 M 96 148 L 96 145" stroke="#A35A00" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </g>

      {/* Main Plump Body */}
      <ellipse className="tokki-body" cx="80" cy="100" rx="38" ry="42" fill="url(#pg-body-navy)" filter="url(#pg-drop-shadow)" />
      
      {/* Brilliant White Belly */}
      <path d="M 50 80 Q 80 150 110 80 Q 110 142 80 140 Q 50 142 50 80 Z" fill="url(#pg-belly-snow)" filter="url(#pg-inner-shadow)" />

      {/* Left Flipper */}
      <path
        className="tokki-flipper--left"
        d="M 45 90 C 25 105 15 130 25 135 C 32 138 42 120 46 100 Z"
        fill="url(#pg-body-navy)"
        filter="url(#pg-drop-shadow)"
      />
      {/* Right Flipper */}
      <path
        className="tokki-flipper--right"
        d="M 115 90 C 135 105 145 130 135 135 C 128 138 118 120 114 100 Z"
        fill="url(#pg-body-navy)"
        filter="url(#pg-drop-shadow)"
      />

      {/* Tail peeking out */}
      <path className="tokki-tail" d="M 70 138 L 80 150 L 90 138 Z" fill="#0B101D" filter="url(#pg-drop-shadow)" />

      {/* Soft Round Head */}
      <circle
        className="tokki-head"
        cx="80"
        cy="55"
        r="34"
        fill="url(#pg-body-navy)"
        filter="url(#pg-drop-shadow)"
      />

      {/* White Face Mask */}
      <path
        d="M 80 82 C 105 82 112 60 108 45 C 105 35 95 38 80 44 C 65 38 55 35 52 45 C 48 60 55 82 80 82 Z"
        fill="url(#pg-face-snow)"
        filter="url(#pg-soft-bevel)"
      />

      {/* Cheeks */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="58" cy="62" rx="8" ry="4" fill="url(#pg-blush)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="102" cy="62" rx="8" ry="4" fill="url(#pg-blush)" />

      {/* Big Cute Eyes */}
      <g className="tokki-eye tokki-eye--left">
        <circle cx="65" cy="54" r="6" fill="#0B101D" />
        <circle cx="63" cy="51" r="2.5" fill="#FFFFFF" />
        <circle cx="67" cy="56" r="1" fill="#FFFFFF" opacity="0.8" />
        <path d="M 58 50 Q 65 46 72 50" fill="none" stroke="#1E2843" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <circle cx="95" cy="54" r="6" fill="#0B101D" />
        <circle cx="93" cy="51" r="2.5" fill="#FFFFFF" />
        <circle cx="97" cy="56" r="1" fill="#FFFFFF" opacity="0.8" />
        <path d="M 88 50 Q 95 46 102 50" fill="none" stroke="#1E2843" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* The Beak */}
      <g className="tokki-beak" filter="url(#pg-soft-bevel)">
        <path d="M 72 60 Q 80 56 88 60 Q 84 68 80 70 Q 76 68 72 60 Z" fill="url(#pg-beak-grad)" />
        <path d="M 72 60 Q 80 63 88 60" fill="none" stroke="#CC7300" strokeWidth="1" opacity="0.5" />
      </g>

      {/* Cozy Red Knit Scarf */}
      <g className="tokki-scarf" filter="url(#pg-drop-shadow)">
        <path d="M 45 78 C 50 68 110 68 115 78 C 120 88 105 92 80 92 C 55 92 40 88 45 78 Z" fill="url(#pg-scarf)" />
        {/* Scarf ribbing/knit lines */}
        <path d="M 55 74 L 52 86 M 65 72 L 62 89 M 75 70 L 72 91 M 85 70 L 88 91 M 95 72 L 98 89 M 105 74 L 108 86" stroke="#8A1313" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        
        {/* Hanging scarf tail */}
        <path d="M 95 85 C 90 100 95 120 105 125 C 110 120 115 100 110 85 Z" fill="url(#pg-scarf)" />
        <path d="M 98 90 L 102 120 M 104 90 L 108 115" stroke="#8A1313" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        {/* Scarf Fringes */}
        <line x1="98" y1="124" x2="96" y2="132" stroke="#D62B2B" strokeWidth="2" strokeLinecap="round" />
        <line x1="102" y1="125" x2="102" y2="134" stroke="#D62B2B" strokeWidth="2" strokeLinecap="round" />
        <line x1="106" y1="124" x2="108" y2="132" stroke="#D62B2B" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Zzz overlay */}
      <g stroke="#304469" strokeWidth="1.5" strokeDasharray="1 3" strokeLinecap="round" opacity="0.8">
        <circle className="tokki-snore tokki-snore--a" cx="120" cy="52" r="5" fill="none" />
        <circle className="tokki-snore tokki-snore--b" cx="128" cy="40" r="3" fill="none" />
      </g>
      <text className="tokki-zzz tokki-zzz--a" x="122" y="48" fontSize="12" fontWeight="900" fill="#304469">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="130" y="36" fontSize="16" fontWeight="900" fill="#304469">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="138" y="20" fontSize="22" fontWeight="900" fill="#304469">Z</text>

    </svg>
  );
}

export default PenguinAsset;

registerAvatar({
  id: "penguin_v1",
  label: "Penguin",
  emoji: "\u{1F427}",
  cssClass: "tokki-asset--penguin",
  accentColor: "#F74343",
  Component: PenguinAsset,
  fx: {
    idle: { particle: "snow", count: [3, 5], zone: { x: [20, 140], y: [0, 60] }, intensity: 0.4 },
    playful: { particle: "snow", count: [5, 8], zone: { x: [10, 150], y: [0, 80] }, intensity: 0.7 },
  },
});
