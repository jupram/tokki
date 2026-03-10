import { registerAvatar } from "./registry";

export function DragonAsset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--dragon"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="dg-body-fire" cx="45%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FF7A7A" />
          <stop offset="40%" stopColor="#E62E2E" />
          <stop offset="85%" stopColor="#991414" />
          <stop offset="100%" stopColor="#540505" />
        </radialGradient>

        <radialGradient id="dg-belly-gold" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#FFF2B2" />
          <stop offset="50%" stopColor="#FFD147" />
          <stop offset="100%" stopColor="#D9881A" />
        </radialGradient>

        <linearGradient id="dg-gold-horn" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#CC8400" />
          <stop offset="50%" stopColor="#FFD147" />
          <stop offset="100%" stopColor="#FFF8D6" />
        </linearGradient>

        <radialGradient id="dg-snout" cx="50%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#FF9C9C" />
          <stop offset="60%" stopColor="#E62E2E" />
          <stop offset="100%" stopColor="#991414" />
        </radialGradient>

        <radialGradient id="dg-eye-ruby" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFD6A3" />
          <stop offset="40%" stopColor="#FF5C00" />
          <stop offset="100%" stopColor="#540505" />
        </radialGradient>
        
        <radialGradient id="dg-mane-flame" cx="30%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFE180" />
          <stop offset="45%" stopColor="#FF9C2A" />
          <stop offset="100%" stopColor="#D9400B" />
        </radialGradient>

        <filter id="dg-heavy-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" />
          <feOffset dx="0" dy="8" />
          <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="dg-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="4" />
          <feComponentTransfer><feFuncA type="linear" slope="0.25" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="dg-fire-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComponentTransfer in="blur" result="glow">
            <feFuncA type="linear" slope="1.2" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="dg-inner-bevel">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#540505" floodOpacity="0.4" />
        </filter>
        
        {/* Dragon Scales Pattern */}
        <pattern id="dg-scales" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
          <path d="M0 8 Q8 -2 16 8 M-8 16 Q0 6 8 16 M8 16 Q16 6 24 16" fill="none" stroke="#FFD147" strokeWidth="1" strokeOpacity="0.3" />
        </pattern>
      </defs>

      <ellipse className="tokki-shadow" cx="80" cy="148" rx="55" ry="12" fill="#540505" opacity="0.3" filter="blur(4px)" />

      {/* Sweeping Dragon Tail */}
      <g className="tokki-tail" filter="url(#dg-soft-shadow)">
        <path d="M 90 120 C 150 125, 175 70, 135 50 C 110 35, 140 25, 155 40" fill="none" stroke="url(#dg-body-fire)" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 90 120 C 150 125, 175 70, 135 50 C 110 35, 140 25, 155 40" fill="none" stroke="url(#dg-scales)" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
        {/* Belly scales on tail */}
        <path d="M 90 132 C 160 135, 182 70, 138 45 C 120 30, 132 20, 150 28" fill="none" stroke="url(#dg-belly-gold)" strokeWidth="8" strokeLinecap="round" opacity="0.9" />
        
        {/* Tail Fluff / Fire */}
        <g filter="url(#dg-fire-glow)">
          <path d="M 152 40 C 170 25, 180 55, 155 68 C 165 80, 135 90, 125 65 C 110 65, 115 35, 140 40 C 140 15, 165 15, 152 40" fill="url(#dg-mane-flame)" />
          <path d="M 148 45 C 160 38, 165 55, 145 62 C 152 70, 135 75, 130 58 C 120 58, 125 40, 140 45 C 140 28, 155 28, 148 45" fill="#FFF2B2" opacity="0.9" />
        </g>
      </g>

      {/* Back Paws */}
      <g filter="url(#dg-heavy-shadow)">
        <ellipse cx="40" cy="132" rx="16" ry="18" transform="rotate(25 40 132)" fill="url(#dg-body-fire)" />
        <ellipse cx="120" cy="132" rx="16" ry="18" transform="rotate(-25 120 132)" fill="url(#dg-body-fire)" />
      </g>
      <ellipse cx="32" cy="142" rx="16" ry="10" fill="url(#dg-snout)" filter="url(#dg-soft-shadow)" />
      <ellipse cx="128" cy="142" rx="16" ry="10" fill="url(#dg-snout)" filter="url(#dg-soft-shadow)" />
      
      {/* Front / Back Gold Claws */}
      <g stroke="url(#dg-gold-horn)" strokeWidth="3" strokeLinecap="round" filter="url(#dg-inner-bevel)">
        <path d="M 22 144 L 18 150 M 32 145 L 28 151 M 42 144 L 38 150" />
        <path d="M 138 144 L 142 150 M 128 145 L 132 151 M 118 144 L 122 150" />
      </g>

      {/* Main Squishy Body */}
      <ellipse className="tokki-body" cx="80" cy="112" rx="44" ry="40" fill="url(#dg-body-fire)" filter="url(#dg-heavy-shadow)" />
      <ellipse cx="80" cy="112" rx="44" ry="40" fill="url(#dg-scales)" />

      {/* Scaled Belly */}
      <path d="M 46 100 C 46 145, 114 145, 114 100 C 114 65, 80 70, 80 70 C 80 70, 46 65, 46 100" fill="url(#dg-belly-gold)" filter="url(#dg-soft-shadow)" />
      
      {/* Belly plating lines */}
      <g opacity="0.4" stroke="#991414" strokeWidth="4" strokeLinecap="round">
        <path d="M 52 92 Q 80 102 108 92" />
        <path d="M 48 106 Q 80 118 112 106" />
        <path d="M 50 120 Q 80 132 110 120" />
        <path d="M 58 135 Q 80 144 102 135" />
      </g>
      <g opacity="0.9" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" filter="blur(1px)">
        <path d="M 52 90 Q 80 100 108 90" />
        <path d="M 48 104 Q 80 116 112 104" />
        <path d="M 50 118 Q 80 130 110 118" />
      </g>

      {/* Dragon Head */}
      <g className="tokki-head" filter="url(#dg-heavy-shadow)">
        {/* Wild Flame Mane */}
        <path d="M 30 75 C 5 85, 10 35, 28 22 C 15 0, 60 5, 65 15 C 80 -15, 130 5, 122 25 C 150 25, 150 85, 128 75 C 135 105, 100 110, 80 105 C 55 110, 25 105, 30 75 Z" fill="url(#dg-mane-flame)" filter="url(#dg-fire-glow)" />
        <path d="M 35 70 C 20 80, 20 40, 32 32 C 22 15, 55 15, 60 25 C 75 -5, 120 15, 115 35 C 140 35, 140 80, 125 70 C 128 90, 100 95, 80 95 C 60 95, 35 90, 35 70 Z" fill="#FFF2B2" opacity="0.8" />

        {/* Golden Horns */}
        <g className="tokki-ear tokki-ear--left" filter="url(#dg-soft-shadow)">
          <path d="M 52 35 C 30 8, 18 10, 12 25" fill="none" stroke="url(#dg-gold-horn)" strokeWidth="14" strokeLinecap="round" />
          <path d="M 35 22 C 25 12, 16 5, 8 10" fill="none" stroke="url(#dg-gold-horn)" strokeWidth="8" strokeLinecap="round" />
          <circle cx="12" cy="25" r="7" fill="#FFF8D6" filter="url(#dg-fire-glow)" />
        </g>
        <g className="tokki-ear tokki-ear--right" filter="url(#dg-soft-shadow)">
          <path d="M 108 35 C 130 8, 142 10, 148 25" fill="none" stroke="url(#dg-gold-horn)" strokeWidth="14" strokeLinecap="round" />
          <path d="M 125 22 C 135 12, 144 5, 152 10" fill="none" stroke="url(#dg-gold-horn)" strokeWidth="8" strokeLinecap="round" />
          <circle cx="148" cy="25" r="7" fill="#FFF8D6" filter="url(#dg-fire-glow)" />
        </g>

        {/* Plump Face */}
        <path d="M 35 55 C 35 20, 125 20, 125 55 C 145 90, 120 110, 80 110 C 40 110, 15 90, 35 55 Z" fill="url(#dg-body-fire)" filter="url(#dg-inner-bevel)" />
        <path d="M 35 55 C 35 20, 125 20, 125 55 C 145 90, 120 110, 80 110 C 40 110, 15 90, 35 55 Z" fill="url(#dg-scales)" opacity="0.6" />

        {/* Huge Bulbous Snout */}
        <path d="M 48 76 C 48 58, 112 58, 112 76 C 118 102, 108 108, 80 108 C 52 108, 42 102, 48 76 Z" fill="url(#dg-snout)" filter="url(#dg-soft-shadow)" />

        {/* Forehead Pearl */}
        <circle cx="80" cy="38" r="8" fill="#FFF2B2" />
        <circle cx="80" cy="38" r="14" fill="#FFD147" opacity="0.4" filter="url(#dg-fire-glow)" />
        <circle cx="78" cy="36" r="3" fill="#FFFFFF" />

        {/* Eyes */}
        <g className="tokki-eye tokki-eye--left">
          <ellipse cx="54" cy="58" rx="13" ry="17" fill="#540505" />
          <ellipse cx="54" cy="62" rx="11" ry="13" fill="url(#dg-eye-ruby)" />
          {/* Eye shines */}
          <circle cx="49" cy="50" r="4.5" fill="#FFFFFF" filter="url(#dg-fire-glow)" />
          <circle cx="60" cy="68" r="2.5" fill="#FFFFFF" opacity="0.9" />
          {/* Slit Pupil */}
          <ellipse cx="55" cy="62" rx="2" ry="7" fill="#290202" />
          <path d="M 40 45 Q 52 38 68 45" fill="none" stroke="#540505" strokeWidth="3.5" strokeLinecap="round" />
        </g>
        <g className="tokki-eye tokki-eye--right">
          <ellipse cx="106" cy="58" rx="13" ry="17" fill="#540505" />
          <ellipse cx="106" cy="62" rx="11" ry="13" fill="url(#dg-eye-ruby)" />
          <circle cx="101" cy="50" r="4.5" fill="#FFFFFF" filter="url(#dg-fire-glow)" />
          <circle cx="112" cy="68" r="2.5" fill="#FFFFFF" opacity="0.9" />
          <ellipse cx="107" cy="62" rx="2" ry="7" fill="#290202" />
          <path d="M 120 45 Q 108 38 92 45" fill="none" stroke="#540505" strokeWidth="3.5" strokeLinecap="round" />
        </g>

        {/* Blush */}
        <ellipse className="tokki-cheek tokki-cheek--left" cx="38" cy="80" rx="10" ry="6" fill="#FF7A7A" opacity="0.8" filter="url(#dg-fire-glow)" />
        <ellipse className="tokki-cheek tokki-cheek--right" cx="122" cy="80" rx="10" ry="6" fill="#FF7A7A" opacity="0.8" filter="url(#dg-fire-glow)" />

        {/* Nostrils */}
        <ellipse className="tokki-nose" cx="68" cy="72" rx="4" ry="2.5" fill="#540505" />
        <ellipse cx="92" cy="72" rx="4" ry="2.5" fill="#540505" />
        <ellipse cx="67" cy="70" rx="1.5" ry="1" fill="#FFFFFF" opacity="0.6" />
        <ellipse cx="91" cy="70" rx="1.5" ry="1" fill="#FFFFFF" opacity="0.6" />

        {/* Floating Smoke/Whiskers */}
        <g className="tokki-smoke" opacity="0.9">
          <path d="M 64 68 Q 50 50 38 48" fill="none" stroke="#FFD147" strokeWidth="3" strokeLinecap="round" filter="url(#dg-fire-glow)" />
          <circle cx="38" cy="48" r="3" fill="#FFFFFF" />
          <path d="M 96 68 Q 110 50 122 48" fill="none" stroke="#FFD147" strokeWidth="3" strokeLinecap="round" filter="url(#dg-fire-glow)" />
          <circle cx="122" cy="48" r="3" fill="#FFFFFF" />
        </g>

        {/* Elegant Whisker Tendrils */}
        <path d="M 48 82 C 15 82, -5 105, 5 95 C 10 88, 20 75, 25 80" fill="none" stroke="url(#dg-gold-horn)" strokeWidth="3" strokeLinecap="round" filter="url(#dg-fire-glow)" />
        <path d="M 52 88 C 25 95, 8 115, 0 125" fill="none" stroke="#FFF8D6" strokeWidth="2" strokeLinecap="round" />

        <path d="M 112 82 C 145 82, 165 105, 155 95 C 150 88, 140 75, 135 80" fill="none" stroke="url(#dg-gold-horn)" strokeWidth="3" strokeLinecap="round" filter="url(#dg-fire-glow)" />
        <path d="M 108 88 C 135 95, 152 115, 160 125" fill="none" stroke="#FFF8D6" strokeWidth="2" strokeLinecap="round" />

        {/* Happy jagged mouth */}
        <path className="tokki-mouth" d="M 65 88 Q 80 98 80 90 Q 80 98 95 88" fill="none" stroke="#540505" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 68 90 L 70 95 L 74 90 Z" fill="#FFFFFF" />
        <path d="M 92 90 L 90 95 L 86 90 Z" fill="#FFFFFF" />
      </g>

      {/* Front Paws */}
      <g className="tokki-paw tokki-paw--left" filter="url(#dg-soft-shadow)">
        <path d="M 50 110 C 30 110, 25 122, 38 130 C 46 134, 58 125, 58 116 Z" fill="url(#dg-snout)" />
        <path d="M 32 122 L 28 125 M 36 126 L 32 130 M 42 128 L 38 134" stroke="url(#dg-gold-horn)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g className="tokki-paw tokki-paw--right" filter="url(#dg-soft-shadow)">
        <path d="M 110 110 C 130 110, 135 122, 122 130 C 114 134, 102 125, 102 116 Z" fill="url(#dg-snout)" />
        <path d="M 128 122 L 132 125 M 124 126 L 128 130 M 118 128 L 122 134" stroke="url(#dg-gold-horn)" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      <circle className="tokki-snore tokki-snore--a" cx="132" cy="55" r="5" fill="#FFE180" opacity="0.8" filter="url(#dg-fire-glow)" />
      <circle className="tokki-snore tokki-snore--b" cx="144" cy="40" r="3" fill="#FFE180" opacity="0.8" filter="url(#dg-fire-glow)" />
      <text className="tokki-zzz tokki-zzz--a" x="132" y="48" fontSize="12" fontWeight="900" fill="#991414">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="142" y="32" fontSize="16" fontWeight="900" fill="#991414">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="154" y="15" fontSize="22" fontWeight="900" fill="#FFD147">Z</text>
    </svg>
  );
}

export default DragonAsset;

registerAvatar({
  id: "dragon_v1",
  label: "Dragon",
  emoji: "\u{1F409}",
  cssClass: "tokki-asset--dragon",
  accentColor: "#E62E2E",
  Component: DragonAsset,
  fx: {
    surprised: { particle: "ember", count: [4, 7], zone: { x: [30, 130], y: [20, 80] }, intensity: 0.8 },
    playful: { particle: "ember", count: [3, 6], zone: { x: [40, 120], y: [30, 90] }, intensity: 0.6 },
  },
});
