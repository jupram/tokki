import { registerAvatar } from "./registry";

export function CatV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--cat"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Soft, deep multi-stop radial gradients for the Cat's fur volume */}
        <radialGradient id="ct-body-plush" cx="45%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FAFAF8" />
          <stop offset="40%" stopColor="#E9E2DA" />
          <stop offset="85%" stopColor="#C4B8AD" />
          <stop offset="100%" stopColor="#A8988B" />
        </radialGradient>

        {/* Deep underbelly shading for a plush 3D effect */}
        <radialGradient id="ct-belly-volumetric" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#FCFAF8" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#D9CEC3" stopOpacity="0.1" />
        </radialGradient>

        <linearGradient id="ct-ear-velvet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC2D1" />
          <stop offset="70%" stopColor="#F08BA5" />
          <stop offset="100%" stopColor="#B34B68" />
        </linearGradient>

        <radialGradient id="ct-cheek-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8596" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#FF9BAA" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFB3BF" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="ct-paw-puff" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F3EEEA" />
          <stop offset="100%" stopColor="#C9BDB0" />
        </radialGradient>

        <radialGradient id="ct-toe-bean" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFB3C6" />
          <stop offset="100%" stopColor="#D96683" />
        </radialGradient>

        <linearGradient id="ct-collar-silk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF6B8B" />
          <stop offset="50%" stopColor="#E6395D" />
          <stop offset="100%" stopColor="#A61C39" />
        </linearGradient>

        <radialGradient id="ct-bell-gold" cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#FFF2A8" />
          <stop offset="40%" stopColor="#F9C63D" />
          <stop offset="80%" stopColor="#DD881A" />
          <stop offset="100%" stopColor="#8A4E08" />
        </radialGradient>

        <radialGradient id="ct-eye-jewel" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="60%" stopColor="#F29F05" />
          <stop offset="100%" stopColor="#9C4400" />
        </radialGradient>

        {/* Sophisticated drop shadow filters */}
        <filter id="ct-shadow-ground" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4.5" />
          <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
        </filter>

        <filter id="ct-drop-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" />
          <feOffset dx="0" dy="5" />
          <feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="ct-soft-bevel" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.15" />
        </filter>
        
        <filter id="ct-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main Ground Shadow */}
      <ellipse className="tokki-shadow" cx="80" cy="142" rx="42" ry="9" fill="#5A4A40" filter="url(#ct-shadow-ground)" />

      {/* Animated fluffy tail stretching elegantly to the right */}
      <g className="tokki-tail" filter="url(#ct-drop-shadow)">
        <path
          d="M 100 110 Q 140 105 142 75 Q 144 50 130 50 Q 120 50 128 65"
          fill="none"
          stroke="url(#ct-body-plush)"
          strokeWidth="15"
          strokeLinecap="round"
        />
        {/* Tail shading and fluff lines */}
        <path
          d="M 100 110 Q 140 105 142 75 Q 144 50 130 50 Q 120 50 128 65"
          fill="none"
          stroke="#A8988B"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path d="M 135 60 Q 138 70 132 85" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* Plump, squeezable body */}
      <ellipse className="tokki-body" cx="80" cy="108" rx="34" ry="28" fill="url(#ct-body-plush)" filter="url(#ct-drop-shadow)" />
      
      {/* Soft rounded belly overlay */}
      <ellipse cx="80" cy="114" rx="22" ry="18" fill="url(#ct-belly-volumetric)" />

      {/* Left Ear */}
      <g className="tokki-ear tokki-ear--left" filter="url(#ct-drop-shadow)">
        <path className="tokki-ear-shell" d="M 45 60 C 25 35 30 10 40 12 C 55 15 65 35 65 52 Z" fill="url(#ct-body-plush)" />
        <path className="tokki-ear-inner" d="M 46 56 C 30 36 36 18 42 20 C 51 24 58 38 60 50 Z" fill="url(#ct-ear-velvet)" />
        {/* Ear fluff overlap */}
        <path d="M 52 50 C 42 42 45 28 45 28 C 45 28 50 40 56 46 Z" fill="#FFFFFF" opacity="0.75" />
      </g>

      {/* Right Ear */}
      <g className="tokki-ear tokki-ear--right" filter="url(#ct-drop-shadow)">
        <path className="tokki-ear-shell" d="M 115 60 C 135 35 130 10 120 12 C 105 15 95 35 95 52 Z" fill="url(#ct-body-plush)" />
        <path className="tokki-ear-inner" d="M 114 56 C 130 36 124 18 118 20 C 109 24 102 38 100 50 Z" fill="url(#ct-ear-velvet)" />
        {/* Ear fluff overlap */}
        <path d="M 108 50 C 118 42 115 28 115 28 C 115 28 110 40 104 46 Z" fill="#FFFFFF" opacity="0.75" />
      </g>

      {/* Head structured as a curved polygon to give it distinct fluffy "Cat" cheeks instead of a raw circle */}
      <path
        className="tokki-head"
        d="M 80 32 C 105 32 122 45 125 65 C 128 85 110 102 80 102 C 50 102 32 85 35 65 C 38 45 55 32 80 32 Z"
        fill="url(#ct-body-plush)"
        filter="url(#ct-drop-shadow)"
      />
      {/* Soft brow highlight */}
      <path d="M 60 42 Q 80 30 100 42 Q 80 48 60 42 Z" fill="#FFFFFF" opacity="0.6" filter="url(#ct-glow)" />

      {/* Left Eye */}
      <g className="tokki-eye tokki-eye--left">
        {/* Iris */}
        <ellipse cx="62" cy="68" rx="8" ry="9" fill="url(#ct-eye-jewel)" stroke="#594432" strokeWidth="1.5" />
        {/* Pupil */}
        <ellipse cx="62" cy="68" rx="2.5" ry="6.5" fill="#1C1008" />
        {/* Specular Catchlights */}
        <circle cx="59.5" cy="64.5" r="2.5" fill="#FFFFFF" opacity="0.95" />
        <circle cx="64" cy="71" r="1" fill="#FFFFFF" opacity="0.7" />
        {/* Eyelashes / eyeliner curve */}
        <path d="M 52 64 Q 62 58 72 65" fill="none" stroke="#423023" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 52 64 Q 50 67 48 70" fill="none" stroke="#423023" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* Right Eye */}
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="98" cy="68" rx="8" ry="9" fill="url(#ct-eye-jewel)" stroke="#594432" strokeWidth="1.5" />
        <ellipse cx="98" cy="68" rx="2.5" ry="6.5" fill="#1C1008" />
        <circle cx="95.5" cy="64.5" r="2.5" fill="#FFFFFF" opacity="0.95" />
        <circle cx="100" cy="71" r="1" fill="#FFFFFF" opacity="0.7" />
        <path d="M 108 64 Q 98 58 88 65" fill="none" stroke="#423023" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 108 64 Q 110 67 112 70" fill="none" stroke="#423023" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* Delicate, glowing blushes */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="50" cy="78" rx="10" ry="6" fill="url(#ct-cheek-glow)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="110" cy="78" rx="10" ry="6" fill="url(#ct-cheek-glow)" />

      {/* Whiskers */}
      <g className="tokki-whisker" opacity="0.45" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M 45 74 Q 35 72 25 74" />
        <path d="M 43 78 Q 30 78 20 80" />
        <path d="M 45 82 Q 35 84 25 88" />
        
        <path d="M 115 74 Q 125 72 135 74" />
        <path d="M 117 78 Q 130 78 140 80" />
        <path d="M 115 82 Q 125 84 135 88" />
      </g>

      {/* Cute tiny cat nose */}
      <path className="tokki-nose" d="M 76 77 Q 80 75 84 77 L 80 81 Z" fill="#F0718D" />
      
      {/* Happy subtle mouth curve */}
      <path className="tokki-mouth" d="M 74 81 Q 77 85 80 81 Q 83 85 86 81" fill="none" stroke="#5C4535" strokeWidth="1.8" strokeLinecap="round" />

      {/* Rich Silk Collar */}
      <path d="M 58 92 Q 80 102 102 92 Q 100 98 80 105 Q 60 98 58 92 Z" fill="url(#ct-collar-silk)" filter="url(#ct-soft-bevel)" />
      
      {/* 3D Shiny Bell */}
      <circle cx="80" cy="98" r="5" fill="url(#ct-bell-gold)" filter="url(#ct-soft-bevel)" />
      <path d="M 76 98 L 84 98" stroke="#8A4E08" strokeWidth="1" strokeLinecap="round" />
      <circle cx="80" cy="100.5" r="1.5" fill="#4A2700" />
      <path d="M 77 95 A 3 3 0 0 1 80 94" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.7" />

      {/* Fluffy detailed Paws positioned adorably */}
      {/* Hind legs/paws */}
      <ellipse cx="64" cy="130" rx="14" ry="9" fill="url(#ct-paw-puff)" filter="url(#ct-soft-bevel)" />
      <ellipse cx="96" cy="130" rx="14" ry="9" fill="url(#ct-paw-puff)" filter="url(#ct-soft-bevel)" />
      
      {/* Front paws neatly tucked */}
      <ellipse className="tokki-paw tokki-paw--left" cx="66" cy="116" rx="12" ry="14" fill="url(#ct-paw-puff)" filter="url(#ct-soft-bevel)" />
      <ellipse className="tokki-paw tokki-paw--right" cx="94" cy="116" rx="12" ry="14" fill="url(#ct-paw-puff)" filter="url(#ct-soft-bevel)" />

      {/* Distinct pink adorable squishy toe beans! */}
      <g opacity="0.9">
        <circle cx="61" cy="120" r="1.8" fill="url(#ct-toe-bean)" />
        <circle cx="66" cy="122" r="2.2" fill="url(#ct-toe-bean)" />
        <circle cx="71" cy="120" r="1.8" fill="url(#ct-toe-bean)" />
        <ellipse cx="66" cy="115" rx="3.5" ry="3" fill="url(#ct-toe-bean)" />

        <circle cx="89" cy="120" r="1.8" fill="url(#ct-toe-bean)" />
        <circle cx="94" cy="122" r="2.2" fill="url(#ct-toe-bean)" />
        <circle cx="99" cy="120" r="1.8" fill="url(#ct-toe-bean)" />
        <ellipse cx="94" cy="115" rx="3.5" ry="3" fill="url(#ct-toe-bean)" />
      </g>

      {/* Styled Snoring / Sleep Emotes */}
      <g stroke="#9E8D80" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3">
        <circle className="tokki-snore tokki-snore--a" cx="120" cy="55" r="6" fill="none" opacity="0.6" />
        <circle className="tokki-snore tokki-snore--b" cx="130" cy="40" r="3.5" fill="none" opacity="0.4" />
      </g>
      <text className="tokki-zzz tokki-zzz--a" x="122" y="52" fontSize="14" fontWeight="800" fill="#9E8D80">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="132" y="37" fontSize="18" fontWeight="800" fill="#9E8D80">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="140" y="20" fontSize="24" fontWeight="800" fill="#9E8D80">Z</text>

    </svg>
  );
}

export default CatV1Asset;

registerAvatar({
  id: "cat_v1",
  label: "Cat",
  emoji: "\u{1F431}",
  cssClass: "tokki-asset--cat",
  accentColor: "#f0e878",
  Component: CatV1Asset,
  fx: {
    curious:   { particle: "wisp", count: [2, 5], zone: { x: [35, 125], y: [25, 85] }, intensity: 0.5 },
    playful:   { particle: "wisp", count: [3, 6], zone: { x: [30, 130], y: [20, 80] }, intensity: 0.7 },
  },
});
