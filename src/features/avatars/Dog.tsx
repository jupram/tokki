import { registerAvatar } from "./registry";

export function DogV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--dog"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Supremely soft fluffy golden retriever / shiba coat gradient */}
        <radialGradient id="dg-body-plush" cx="45%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#FFE4C4" />
          <stop offset="75%" stopColor="#F5B069" />
          <stop offset="100%" stopColor="#D97A29" />
        </radialGradient>

        <radialGradient id="dg-belly-fluff" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#FFF1E0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFE4C4" stopOpacity="0.2" />
        </radialGradient>

        <linearGradient id="dg-ear-velvet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE1D9" />
          <stop offset="50%" stopColor="#FFC2B3" />
          <stop offset="100%" stopColor="#E68A73" />
        </linearGradient>

        <radialGradient id="dg-cheek-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8B73" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#FFB3A3" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFDED4" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="dg-paw-plush" cx="45%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#FFEFE0" />
          <stop offset="100%" stopColor="#E6AD7A" />
        </radialGradient>

        <radialGradient id="dg-paw-pad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4A3423" />
          <stop offset="100%" stopColor="#2E1C10" />
        </radialGradient>

        {/* Shiny puppy nose */}
        <radialGradient id="dg-nose-shine" cx="40%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#8A6B56" />
          <stop offset="40%" stopColor="#402C20" />
          <stop offset="100%" stopColor="#1A100A" />
        </radialGradient>

        <radialGradient id="dg-tongue-squish" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#FFB3C6" />
          <stop offset="60%" stopColor="#FF6B8B" />
          <stop offset="100%" stopColor="#D92B54" />
        </radialGradient>

        {/* Big puppy puppy-dog-eyes */}
        <radialGradient id="dg-eye-cosmos" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#664634" />
          <stop offset="40%" stopColor="#362217" />
          <stop offset="100%" stopColor="#140B06" />
        </radialGradient>

        {/* Classic Red Dog Collar */}
        <linearGradient id="dg-collar" x1="0" y1="0.2" x2="1" y2="0.8">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="50%" stopColor="#E62E2E" />
          <stop offset="100%" stopColor="#A31313" />
        </linearGradient>

        <radialGradient id="dg-tag-gold" cx="30%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#FFF2A8" />
          <stop offset="40%" stopColor="#E8C148" />
          <stop offset="100%" stopColor="#B58924" />
        </radialGradient>

        {/* Living Toy Filters */}
        <filter id="dg-shadow-ambient" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
          <feComponentTransfer><feFuncA type="linear" slope="0.25" /></feComponentTransfer>
        </filter>

        <filter id="dg-drop-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="6" />
          <feComponentTransfer><feFuncA type="linear" slope="0.2" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="dg-soft-bevel" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
        </filter>

        <filter id="dg-glow-faint">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse className="tokki-shadow" cx="80" cy="144" rx="46" ry="12" fill="#5E432A" filter="url(#dg-shadow-ambient)" />

      {/* Waggable Puppy Tail */}
      <path
        className="tokki-tail"
        d="M 108 112 C 145 100 155 75 135 60 C 128 52 120 55 125 70"
        fill="none"
        stroke="url(#dg-body-plush)"
        strokeWidth="16"
        strokeLinecap="round"
        filter="url(#dg-drop-shadow)"
      />
      {/* Tail pale tip */}
      <path d="M 132 60 C 125 50 120 55 125 70" fill="none" stroke="#FFF1E0" strokeWidth="16" strokeLinecap="round" opacity="0.8" />
      <path d="M 108 112 C 145 100 155 75 135 60" fill="none" stroke="#FFFFFF" strokeWidth="4" opacity="0.3" filter="url(#dg-glow-faint)" />

      {/* Squishy Puppy Body */}
      <ellipse
        className="tokki-body"
        cx="80"
        cy="110"
        rx="36"
        ry="30"
        fill="url(#dg-body-plush)"
        filter="url(#dg-drop-shadow)"
      />
      
      {/* Plump puppy belly */}
      <ellipse cx="80" cy="118" rx="24" ry="18" fill="url(#dg-belly-fluff)" />

      {/* Left Ear - Big, floppy, and soft */}
      <g className="tokki-ear tokki-ear--left" filter="url(#dg-drop-shadow)">
        <path className="tokki-ear-shell" d="M 46 62 C 20 55 -5 85 24 108 C 40 125 58 110 52 82 Z" fill="url(#dg-body-plush)" />
        <path className="tokki-ear-inner" d="M 43 65 C 24 60 10 82 28 100 C 38 110 48 100 48 82 Z" fill="url(#dg-ear-velvet)" opacity="0.9" />
        <path d="M 32 82 C 34 94 40 98 44 94" stroke="#D97A29" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* Right Ear - Animated floppy ear */}
      <g className="tokki-ear tokki-ear--right" filter="url(#dg-drop-shadow)">
        <path className="tokki-ear-shell" d="M 114 62 C 140 55 165 85 136 108 C 120 125 102 110 108 82 Z" fill="url(#dg-body-plush)" />
        <path className="tokki-ear-inner" d="M 117 65 C 136 60 150 82 132 100 C 122 110 112 100 112 82 Z" fill="url(#dg-ear-velvet)" opacity="0.9" />
        <path d="M 128 82 C 126 94 120 98 116 94" stroke="#D97A29" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* Head / Big Puppy Noggin */}
      <path
        className="tokki-head"
        d="M 80 32 C 110 32 125 48 128 72 C 130 95 110 110 80 110 C 50 110 30 95 32 72 C 35 48 50 32 80 32 Z"
        fill="url(#dg-body-plush)"
        filter="url(#dg-drop-shadow)"
      />
      {/* Light muzzle / eyebrow area */}
      <path d="M 52 75 C 52 50 108 50 108 75 C 115 95 100 110 80 110 C 60 110 45 95 52 75 Z" fill="url(#dg-belly-fluff)" />
      
      {/* Glossy forehead fur */}
      <path d="M 58 45 Q 80 30 102 45 Q 80 50 58 45 Z" fill="#FFFFFF" opacity="0.6" filter="url(#dg-glow-faint)" />

      {/* Eyebrow dots (like Shiba/Rotty) */}
      <ellipse cx="62" cy="55" rx="5" ry="3.5" fill="#FFFFFF" opacity="0.8" />
      <ellipse cx="98" cy="55" rx="5" ry="3.5" fill="#FFFFFF" opacity="0.8" />

      {/* Huge Puppy Dog Eyes */}
      <g className="tokki-eye tokki-eye--left">
        <ellipse cx="62" cy="72" rx="9" ry="10.5" fill="url(#dg-eye-cosmos)" stroke="#362217" strokeWidth="1.5" />
        <circle cx="60" cy="67" r="4" fill="#FFFFFF" opacity="0.95" />
        <circle cx="64" cy="76" r="1.5" fill="#FFFFFF" opacity="0.8" />
        {/* Sweet brow/eyelid curve */}
        <path d="M 53 66 Q 62 62 68 68" fill="none" stroke="#2E1C10" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="98" cy="72" rx="9" ry="10.5" fill="url(#dg-eye-cosmos)" stroke="#362217" strokeWidth="1.5" />
        <circle cx="96" cy="67" r="4" fill="#FFFFFF" opacity="0.95" />
        <circle cx="100" cy="76" r="1.5" fill="#FFFFFF" opacity="0.8" />
        <path d="M 92 68 Q 98 62 107 66" fill="none" stroke="#2E1C10" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Puppy Blush */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="46" cy="85" rx="10" ry="6" fill="url(#dg-cheek-blush)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="114" cy="85" rx="10" ry="6" fill="url(#dg-cheek-blush)" />

      {/* Big Boop-able Nose */}
      <ellipse className="tokki-nose" cx="80" cy="83" rx="11" ry="7" fill="url(#dg-nose-shine)" />
      {/* Shine on nose */}
      <path d="M 73 80 Q 80 77 87 80" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      <circle cx="76" cy="83" r="1.5" fill="#FFFFFF" opacity="0.5" />
      <circle cx="84" cy="83" r="1.5" fill="#FFFFFF" opacity="0.5" />

      {/* Happy Puppy Mouth */}
      <path className="tokki-mouth" d="M 68 93 C 74 100 80 96 80 93 C 80 96 86 100 92 93" fill="none" stroke="#362217" strokeWidth="2.2" strokeLinecap="round" />
      
      {/* Hanging tongue (Panting cutely) */}
      <path d="M 75 96 C 75 106 85 106 85 96 Z" fill="url(#dg-tongue-squish)" filter="url(#dg-soft-bevel)" />
      <path d="M 80 96 L 80 102" fill="none" stroke="#8A0F2B" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />

      {/* Classic Red Dog Collar with Gold Bone Tag */}
      <g filter="url(#dg-drop-shadow)">
        <path d="M 52 102 Q 80 115 108 102 Q 112 110 80 118 Q 48 110 52 102 Z" fill="url(#dg-collar)" />
        {/* Little stitching line on collar */}
        <path d="M 56 105 Q 80 115 104 105" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        
        {/* Collar Gold Ring */}
        <circle cx="80" cy="112" r="3.5" fill="none" stroke="#FFD700" strokeWidth="1.5" />
        
        {/* Gold Bone Tag */}
        <g transform="translate(80, 119)">
          <path d="M -6 -2 C -10 -4 -10 2 -6 2 L 6 2 C 10 2 10 -4 6 -2 Z" fill="url(#dg-tag-gold)" stroke="#8A6500" strokeWidth="0.8" />
          <circle cx="-5" cy="0" r="2" fill="url(#dg-tag-gold)" stroke="#8A6500" strokeWidth="0.8" />
          <circle cx="5" cy="0" r="2" fill="url(#dg-tag-gold)" stroke="#8A6500" strokeWidth="0.8" />
          {/* Shine */}
          <path d="M -4 -1 L 4 -1" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
        </g>
      </g>

      {/* Sleep Zzzs */}
      <g stroke="#A37854" strokeWidth="1.5" strokeDasharray="2 3" strokeLinecap="round" opacity="0.8">
        <circle className="tokki-snore tokki-snore--a" cx="122" cy="62" r="5.5" fill="none" />
        <circle className="tokki-snore tokki-snore--b" cx="132" cy="50" r="3.5" fill="none" />
      </g>
      <text className="tokki-zzz tokki-zzz--a" x="124" y="58" fontSize="13" fontWeight="900" fill="#875E3D">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="134" y="44" fontSize="18" fontWeight="900" fill="#875E3D">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="142" y="26" fontSize="24" fontWeight="900" fill="#875E3D">Z</text>

      {/* Front Paws - Big and clumsy puppy paws */}
      <ellipse className="tokki-paw tokki-paw--left" cx="62" cy="120" rx="16" ry="13" fill="url(#dg-paw-plush)" filter="url(#dg-soft-bevel)" />
      <ellipse className="tokki-paw tokki-paw--right" cx="98" cy="120" rx="16" ry="13" fill="url(#dg-paw-plush)" filter="url(#dg-soft-bevel)" />
      
      {/* Front toe separations */}
      <path d="M 54 126 L 54 131" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M 62 128 L 62 132" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M 70 126 L 70 131" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      
      <path d="M 90 126 L 90 131" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M 98 128 L 98 132" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M 106 126 L 106 131" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />

      {/* Cute visible bottom paw pads just peeking up */}
      <g opacity="0.95">
        <circle cx="56" cy="116" r="2.5" fill="url(#dg-paw-pad)" />
        <circle cx="62" cy="115" r="2.5" fill="url(#dg-paw-pad)" />
        <circle cx="68" cy="116" r="2.5" fill="url(#dg-paw-pad)" />
        
        <circle cx="92" cy="116" r="2.5" fill="url(#dg-paw-pad)" />
        <circle cx="98" cy="115" r="2.5" fill="url(#dg-paw-pad)" />
        <circle cx="104" cy="116" r="2.5" fill="url(#dg-paw-pad)" />
      </g>

      {/* Back Paws */}
      <ellipse cx="56" cy="134" rx="18" ry="11" fill="url(#dg-paw-plush)" filter="url(#dg-soft-bevel)" />
      <ellipse cx="104" cy="134" rx="18" ry="11" fill="url(#dg-paw-plush)" filter="url(#dg-soft-bevel)" />

      <path d="M 48 136 L 48 140" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M 54 138 L 54 142" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M 60 136 L 60 140" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />

      <path d="M 100 136 L 100 140" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M 106 138 L 106 142" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M 112 136 L 112 140" stroke="#D97A29" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />

    </svg>
  );
}

export default DogV1Asset;

registerAvatar({
  id: "dog_v1",
  label: "Dog",
  emoji: "\u{1F436}",
  cssClass: "tokki-asset--dog",
  accentColor: "#F5B069",
  Component: DogV1Asset,
  fx: {
    playful:   { particle: "star", count: [3, 6], zone: { x: [30, 130], y: [20, 80] }, intensity: 0.7 },
    surprised: { particle: "star", count: [4, 8], zone: { x: [20, 140], y: [10, 70] }, intensity: 0.9 },
  },
});
