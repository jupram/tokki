import { registerAvatar } from "./registry";

function CelestialOwlV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--owl"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Soft shadow filter for fluffiness/depth */}
        <filter id="ow-shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0A0C16" floodOpacity="0.4" />
        </filter>
        <filter id="ow-wing-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#05070D" floodOpacity="0.3" />
        </filter>

        {/* Eye glow filter */}
        <filter id="ow-eye-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Dynamic Gradients */}
        <radialGradient id="ow-body-fluff" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#4A65A6" />
          <stop offset="40%" stopColor="#253570" />
          <stop offset="90%" stopColor="#131C42" />
        </radialGradient>

        <radialGradient id="ow-belly-fluff" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFF7E6" />
          <stop offset="40%" stopColor="#FFE0AA" />
          <stop offset="90%" stopColor="#A28D60" />
        </radialGradient>
        
        <radialGradient id="ow-head-base" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#5575BD" />
          <stop offset="50%" stopColor="#2E4387" />
          <stop offset="100%" stopColor="#1A2552" />
        </radialGradient>

        {/* Facial Disc Heart */}
        <radialGradient id="ow-face-disc" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#F5EDF9" />
          <stop offset="80%" stopColor="#D2C3DB" />
          <stop offset="100%" stopColor="#B3A2C0" />
        </radialGradient>

        {/* Big Cosmic Eyes */}
        <radialGradient id="ow-iris" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF280" />
          <stop offset="30%" stopColor="#E6B522" />
          <stop offset="70%" stopColor="#A34600" />
          <stop offset="100%" stopColor="#401438" />
        </radialGradient>

        <linearGradient id="ow-tuft" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#131C42" />
          <stop offset="50%" stopColor="#2E4387" />
          <stop offset="100%" stopColor="#FFD13B" />
        </linearGradient>

        <linearGradient id="ow-beak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE275" />
          <stop offset="100%" stopColor="#B87D18" />
        </linearGradient>

        <radialGradient id="ow-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF85B3" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FF85B3" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="ow-gold-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF4AD" />
          <stop offset="50%" stopColor="#FFC824" />
          <stop offset="100%" stopColor="#B3780E" />
        </linearGradient>

        {/* Wing gradients */}
        <linearGradient id="ow-wing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#354D8C" />
          <stop offset="70%" stopColor="#1B2859" />
          <stop offset="100%" stopColor="#0B1330" />
        </linearGradient>
      </defs>

      {/* Floating celestial magic - stars framing the owl */}
      <g opacity="0.6" filter="url(#ow-eye-glow)">
        <polygon points="20,15 22,22 29,24 22,26 20,33 18,26 11,24 18,22" fill="#FFF4AD" />
        <polygon points="140,25 141,30 146,31 141,32 140,37 139,32 134,31 139,30" fill="#FFF4AD" />
        <polygon points="125,12 126,16 130,17 126,18 125,22 124,18 120,17 124,16" fill="#FFFFFF" opacity="0.8" />
        <circle cx="35" cy="18" r="1.5" fill="#FFF" />
        <circle cx="28" cy="10" r="1" fill="#FFF" opacity="0.5" />
        <circle cx="132" cy="42" r="1.5" fill="#FFF" />
      </g>

      {/* Ground shadow */}
      <ellipse className="tokki-shadow" cx="80" cy="148" rx="42" ry="7" fill="#0A0C16" opacity="0.4" />

      {/* ======== Tail ======== */}
      <g className="tokki-tail" filter="url(#ow-shadow)">
        <path d="M60 120 C 60 145, 100 145, 100 120 Z" fill="#131C42" />
        <path d="M65 125 C 65 150, 95 150, 95 125 Z" fill="#1A2552" />
        {/* Tail feathers detail */}
        <path d="M70 125 L 80 145 L 90 125" fill="none" stroke="url(#ow-gold-accent)" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* ======== Body — Super plump ======== */}
      <g className="tokki-body" filter="url(#ow-shadow)">
        {/* Main fluffy body */}
        <ellipse cx="80" cy="105" rx="42" ry="38" fill="url(#ow-body-fluff)" />
        {/* Cute pale belly */}
        <ellipse cx="80" cy="110" rx="28" ry="26" fill="url(#ow-belly-fluff)" />
        {/* Belly gold motif feathers */}
        <path d="M72 95 Q 80 102 88 95" fill="none" stroke="#DCA23E" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M68 105 Q 80 115 92 105" fill="none" stroke="#DCA23E" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M70 115 Q 80 126 90 115" fill="none" stroke="#DCA23E" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M75 125 Q 80 132 85 125" fill="none" stroke="#DCA23E" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </g>

      {/* ======== Left wing — Hugging the body ======== */}
      <g className="tokki-paw tokki-paw--left" filter="url(#ow-wing-shadow)">
        <path
          d="M48 85 C 15 90, 20 135, 45 130 C 55 128, 48 105, 48 85 Z"
          fill="url(#ow-wing)"
        />
        {/* Wing coverts */}
        <path d="M42 95 C 28 105, 30 120, 42 115" fill="url(#ow-gold-accent)" opacity="0.8" />
        <path d="M45 105 C 32 115, 35 125, 42 122" fill="url(#ow-gold-accent)" opacity="0.6" />
      </g>

      {/* ======== Right wing — Hugging the body ======== */}
      <g className="tokki-paw tokki-paw--right" filter="url(#ow-wing-shadow)">
        <path
          d="M112 85 C 145 90, 140 135, 115 130 C 105 128, 112 105, 112 85 Z"
          fill="url(#ow-wing)"
        />
        {/* Wing coverts */}
        <path d="M118 95 C 132 105, 130 120, 118 115" fill="url(#ow-gold-accent)" opacity="0.8" />
        <path d="M115 105 C 128 115, 125 125, 118 122" fill="url(#ow-gold-accent)" opacity="0.6" />
      </g>

      {/* ======== Talons ======== */}
      <g className="tokki-paw" filter="url(#ow-wing-shadow)">
        {/* Left foot */}
        <path d="M64 135 C 58 142, 60 148, 66 142 C 68 148, 70 142, 70 135" fill="url(#ow-beak)" stroke="#A36B00" strokeWidth="1" />
        {/* Right foot */}
        <path d="M96 135 C 102 142, 100 148, 94 142 C 92 148, 90 142, 90 135" fill="url(#ow-beak)" stroke="#A36B00" strokeWidth="1" />
      </g>

      {/* ======== Head and Face ======== */}
      <g className="tokki-head" filter="url(#ow-shadow)">
        {/* Huge adorable round head */}
        <ellipse cx="80" cy="55" rx="55" ry="46" fill="url(#ow-head-base)" />
        
        {/* Ear tufts — left */}
        <g className="tokki-ear tokki-ear--left">
          <path d="M35 35 C 25 15, 20 18, 48 30 Z" fill="url(#ow-tuft)" />
          <path d="M38 34 C 30 20, 25 22, 45 32 Z" fill="#2E4387" />
        </g>
        {/* Ear tufts — right */}
        <g className="tokki-ear tokki-ear--right">
          <path d="M125 35 C 135 15, 140 18, 112 30 Z" fill="url(#ow-tuft)" />
          <path d="M122 34 C 130 20, 135 22, 115 32 Z" fill="#2E4387" />
        </g>

        {/* Facial Heart Disc - huge and cute */}
        <path
          d="M80 35 C 110 15, 145 55, 125 80 C 105 105, 85 90, 80 90 C 75 90, 55 105, 35 80 C 15 55, 50 15, 80 35 Z"
          fill="url(#ow-face-disc)"
        />
        
        {/* Inner facial disc ring for depth */}
        <path
          d="M80 40 C 105 25, 135 55, 118 75 C 100 95, 85 85, 80 85 C 75 85, 60 95, 42 75 C 25 55, 55 25, 80 40 Z"
          fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.6"
        />

        {/* Blush */}
        <circle className="tokki-cheek tokki-cheek--left" cx="48" cy="74" r="9" fill="url(#ow-blush)" />
        <circle className="tokki-cheek tokki-cheek--right" cx="112" cy="74" r="9" fill="url(#ow-blush)" />

        {/* EYES */}
        <g className="tokki-eye tokki-eye--left">
          {/* Big eye base */}
          <circle cx="56" cy="60" r="16" fill="#13081A" />
          <circle cx="56" cy="62" r="15" fill="url(#ow-iris)" />
          <circle cx="56" cy="62" r="15" fill="none" stroke="url(#ow-gold-accent)" strokeWidth="1.5" />
          {/* Huge pupil */}
          <circle cx="58" cy="62" r="10" fill="#13081A" />
          {/* Cosmic Galaxy reflections in eye */}
          <path d="M52 66 Q 56 72 64 66" fill="none" stroke="#FF5C99" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <path d="M50 56 Q 58 50 64 56" fill="none" stroke="#66D9FF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          {/* Catchlights */}
          <circle cx="52" cy="54" r="4.5" fill="#FFF" opacity="0.95" />
          <circle cx="62" cy="68" r="2" fill="#FFF" opacity="0.8" />
          <circle cx="48" cy="64" r="1" fill="#FFF" opacity="0.6" />
        </g>

        <g className="tokki-eye tokki-eye--right">
          <circle cx="104" cy="60" r="16" fill="#13081A" />
          <circle cx="104" cy="62" r="15" fill="url(#ow-iris)" />
          <circle cx="104" cy="62" r="15" fill="none" stroke="url(#ow-gold-accent)" strokeWidth="1.5" />
          <circle cx="102" cy="62" r="10" fill="#13081A" />
          {/* Cosmic Galaxy reflections */}
          <path d="M96 66 Q 104 72 108 66" fill="none" stroke="#FF5C99" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <path d="M96 56 Q 102 50 110 56" fill="none" stroke="#66D9FF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          {/* Catchlights */}
          <circle cx="100" cy="54" r="4.5" fill="#FFF" opacity="0.95" />
          <circle cx="110" cy="68" r="2" fill="#FFF" opacity="0.8" />
          <circle cx="98" cy="64" r="1" fill="#FFF" opacity="0.6" />
        </g>

        {/* Beak */}
        <polygon
          className="tokki-nose"
          points="80,82 72,70 88,70"
          fill="url(#ow-beak)"
          stroke="#995E05"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M75 72 L 80 80 L 85 72" fill="#FFF" opacity="0.3" />

        {/* Mouth (cute curve tucked right under beak) */}
        <path
          className="tokki-mouth"
          d="M75 83 Q 80 86, 85 83"
          fill="none"
          stroke="#995E05"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Celestial Forehead Jewel Motif */}
        <path d="M80 20 L 84 32 L 80 38 L 76 32 Z" fill="url(#ow-gold-accent)" filter="url(#ow-eye-glow)" />
        <circle cx="80" cy="30" r="3" fill="#FFF" opacity="0.8" />
      </g>

      {/* ======== Zzz / Snore elements ======== */}
      <circle className="tokki-snore tokki-snore--a" cx="125" cy="20" r="5" fill="#FFE275" opacity="0.6" />
      <circle className="tokki-snore tokki-snore--b" cx="135" cy="12" r="3" fill="#FFE275" opacity="0.6" />
      <text className="tokki-zzz tokki-zzz--a" x="127" y="17" fontSize="12" fontWeight="bold" fill="#B3780E">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="137" y="10" fontSize="15" fontWeight="bold" fill="#B3780E">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="145" y="-2" fontSize="20" fontWeight="bold" fill="#B3780E">Z</text>
    </svg>
  );
}

registerAvatar({
  id: "owl_v1",
  label: "Celestial Owl",
  emoji: "\u{1F989}",
  cssClass: "tokki-asset--owl",
  accentColor: "#B39DDB",
  Component: CelestialOwlV1Asset,
  fx: {
    idle: { particle: "star", count: [2, 3], zone: { x: [20, 140], y: [10, 100] }, intensity: 0.4 },
    playful: { particle: "star", count: [4, 6], zone: { x: [10, 150], y: [10, 150] }, intensity: 0.8 },
    surprised: { particle: "wisp", count: [3, 5], zone: { x: [30, 130], y: [10, 80] }, intensity: 1.0 },
    sleepy: { particle: "snow", count: [1, 2], zone: { x: [50, 110], y: [80, 130] }, intensity: 0.2 }
  }
});

