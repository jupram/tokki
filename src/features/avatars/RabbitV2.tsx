import { registerAvatar } from "./registry";

export function RabbitV2Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--rabbit-v2"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Sumptuous rounded body shading, soft like plush fabric - Sakura theme */}
        <radialGradient id="r2-body" cx="45%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#FFF2F5" />
          <stop offset="85%" stopColor="#FAD4DF" />
          <stop offset="100%" stopColor="#ECA2B6" />
        </radialGradient>
        
        {/* Softest possible belly volume */}
        <radialGradient id="r2-belly" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#FFF2F5" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FAD4DF" stopOpacity="0.2" />
        </radialGradient>

        <linearGradient id="r2-ear-velvet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#FFE1EB" />
          <stop offset="100%" stopColor="#FF7A9C" />
        </linearGradient>

        <radialGradient id="r2-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF477E" stopOpacity="0.75" />
          <stop offset="40%" stopColor="#FF7BA3" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF7BA3" stopOpacity="0" />
        </radialGradient>

        {/* Detailed adorable limbs */}
        <radialGradient id="r2-paw" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#FFF2F5" />
          <stop offset="100%" stopColor="#F2B6C7" />
        </radialGradient>

        {/* Squishy toe beans */}
        <radialGradient id="r2-pad" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FF7BA3" />
          <stop offset="100%" stopColor="#D93D6B" />
        </radialGradient>

        {/* Exquisite Ribbon Shading - Ukiyo-e Gold & Crimson */}
        <linearGradient id="r2-ribbon" x1="0" y1="0.2" x2="1" y2="0.8">
          <stop offset="0%" stopColor="#FF5C5C" />
          <stop offset="35%" stopColor="#E63946" />
          <stop offset="70%" stopColor="#B31A26" />
          <stop offset="100%" stopColor="#7A0010" />
        </linearGradient>

        <radialGradient id="r2-ribbon-knot" cx="30%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="40%" stopColor="#FFC800" />
          <stop offset="100%" stopColor="#D49A00" />
        </radialGradient>

        <radialGradient id="r2-eye-bg" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#8A2946" />
          <stop offset="40%" stopColor="#4A0F22" />
          <stop offset="100%" stopColor="#1A040C" />
        </radialGradient>

        {/* Blossom particle def */}
        <g id="r2-petal">
          <path d="M0,0 C-4,-4 -6,-10 0,-14 C6,-10 4,-4 0,0" fill="#FF7BA3" filter="drop-shadow(0px 2px 1px rgba(255,123,163,0.3))" />
        </g>

        {/* Filters for supreme living-toy presence */}
        <filter id="r2-shadow-ambient" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
          <feComponentTransfer><feFuncA type="linear" slope="0.2" /></feComponentTransfer>
        </filter>

        <filter id="r2-drop-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="6" />
          <feComponentTransfer><feFuncA type="linear" slope="0.15" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="r2-soft-bevel" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.10" />
        </filter>

        <filter id="r2-glow-faint">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Ambient shadow grounding the rabbit to the interface */}
      <ellipse className="tokki-shadow" cx="80" cy="144" rx="44" ry="11" fill="#8C586B" filter="url(#r2-shadow-ambient)" />

      {/* Main squishy body block */}
      <ellipse
        className="tokki-body"
        cx="80"
        cy="110"
        rx="38"
        ry="30"
        fill="url(#r2-body)"
        filter="url(#r2-drop-shadow)"
      />
      
      {/* Plump belly */}
      <ellipse cx="80" cy="116" rx="24" ry="19" fill="url(#r2-belly)" />

      {/* Left Ear - Long and gracefully flopping backward */}
      <g className="tokki-ear tokki-ear--left" filter="url(#r2-drop-shadow)">
        <path className="tokki-ear-shell" d="M 45 60 C 15 30 15 -5 45 10 C 65 20 70 40 60 62 Z" fill="url(#r2-body)" />
        <path className="tokki-ear-inner" d="M 46 54 C 25 32 25 5 45 15 C 58 24 62 40 55 56 Z" fill="url(#r2-ear-velvet)" />
        <path d="M 52 50 C 40 40 45 28 45 28 C 45 28 48 38 56 46 Z" fill="#FFFFFF" opacity="0.8" filter="url(#r2-glow-faint)" />
      </g>

      {/* Right Ear - Animated bounce posture */}
      <g className="tokki-ear tokki-ear--right" filter="url(#r2-drop-shadow)">
        <path className="tokki-ear-shell" d="M 115 60 C 145 30 145 -5 115 10 C 95 20 90 40 100 62 Z" fill="url(#r2-body)" />
        <path className="tokki-ear-inner" d="M 114 54 C 135 32 135 5 115 15 C 102 24 98 40 105 56 Z" fill="url(#r2-ear-velvet)" />
        <path d="M 108 50 C 120 40 115 28 115 28 C 115 28 112 38 104 46 Z" fill="#FFFFFF" opacity="0.8" filter="url(#r2-glow-faint)" />
      </g>

      {/* Plump Head Geometry */}
      <path
        className="tokki-head"
        d="M 80 28 C 110 28 128 45 130 68 C 132 88 112 105 80 105 C 48 105 28 88 30 68 C 32 45 50 28 80 28 Z"
        fill="url(#r2-body)"
        filter="url(#r2-drop-shadow)"
      />
      {/* Glossy forehead sheen */}
      <path d="M 55 42 Q 80 25 105 42 Q 80 50 55 42 Z" fill="#FFFFFF" opacity="0.75" filter="url(#r2-glow-faint)" />
      
      {/* Adorable little messy hair tuft (Forelock) */}
      <path d="M 70 28 Q 80 14 90 28 Q 85 36 80 38 Q 75 36 70 28 Z" fill="#FFFFFF" filter="url(#r2-soft-bevel)" opacity="0.9" />
      <path d="M 66 35 Q 75 22 83 32 Q 78 38 72 38 Z" fill="#FFFFFF" opacity="0.85" />
      <path d="M 94 35 Q 85 22 77 32 Q 82 38 88 38 Z" fill="#FFFFFF" opacity="0.85" />

      {/* Deep Space / Cosmos Eyes */}
      <g className="tokki-eye tokki-eye--left">
        <ellipse cx="58" cy="72" rx="8" ry="10.5" fill="url(#r2-eye-bg)" stroke="#4A0F22" strokeWidth="1.5" />
        <circle cx="56" cy="67" r="3.5" fill="#FFFFFF" opacity="0.95" />
        <circle cx="61" cy="76" r="1.5" fill="#FFFFFF" opacity="0.8" />
        {/* Pink Glow underneath */}
        <path d="M 50 81 Q 58 84 64 81" fill="none" stroke="#FF7BA3" strokeWidth="2" strokeLinecap="round" opacity="0.6" filter="url(#r2-glow-faint)" />
        {/* Flirty Eyelashes */}
        <path d="M 48 68 Q 50 63 56 61" fill="none" stroke="#4A0F22" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 48 68 Q 46 72 44 76" fill="none" stroke="#4A0F22" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="102" cy="72" rx="8" ry="10.5" fill="url(#r2-eye-bg)" stroke="#4A0F22" strokeWidth="1.5" />
        <circle cx="100" cy="67" r="3.5" fill="#FFFFFF" opacity="0.95" />
        <circle cx="105" cy="76" r="1.5" fill="#FFFFFF" opacity="0.8" />
        <path d="M 96 81 Q 102 84 110 81" fill="none" stroke="#FF7BA3" strokeWidth="2" strokeLinecap="round" opacity="0.6" filter="url(#r2-glow-faint)" />
        {/* Flirty Eyelashes */}
        <path d="M 112 68 Q 110 63 104 61" fill="none" stroke="#4A0F22" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 112 68 Q 114 72 116 76" fill="none" stroke="#4A0F22" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* Exaggerated cute blushes */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="48" cy="84" rx="12" ry="7" fill="url(#r2-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="112" cy="84" rx="12" ry="7" fill="url(#r2-cheek)" />

      {/* Micro-tiny pink rabbit nose */}
      <path className="tokki-nose" d="M 77 78 Q 80 75 83 78 Q 82 82 80 83 Q 78 82 77 78 Z" fill="#FF477E" />
      <circle cx="79" cy="79" r="1.2" fill="#FFFFFF" opacity="0.75" />

      {/* Shy, gentle smile */}
      <path className="tokki-mouth" d="M 72 85 Q 76 90 80 85 Q 84 90 88 85" fill="none" stroke="#8A2946" strokeWidth="1.8" strokeLinecap="round" />
      {/* Tongue tiny bit */}
      <path d="M 77 87 Q 80 91.5 83 87 Z" fill="#FF7BA3" />

      {/* Exquisite Traditional Crimson Ribbon + Gold Bell */}
      <g filter="url(#r2-drop-shadow)">
        <path d="M 68 102 C 55 90 40 100 50 112 C 58 118 70 108 75 104 L 68 102 Z" fill="url(#r2-ribbon)" />
        <path d="M 92 102 C 105 90 120 100 110 112 C 102 118 90 108 85 104 L 92 102 Z" fill="url(#r2-ribbon)" />
        <path d="M 65 110 C 55 125 50 135 60 135 C 70 135 78 120 80 110 L 65 110 Z" fill="url(#r2-ribbon)" />
        <path d="M 95 110 C 105 125 110 135 100 135 C 90 135 82 120 80 110 L 95 110 Z" fill="url(#r2-ribbon)" />
        <circle cx="80" cy="105" r="7.5" fill="url(#r2-ribbon-knot)" stroke="#B37700" strokeWidth="1" />
        <path d="M 75 106 L 85 106" stroke="#B37700" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="80" cy="108" r="1.5" fill="#B37700" />
        <circle cx="77" cy="102" r="3" fill="#FFFFFF" opacity="0.8" />
      </g>

      {/* Cute sleeping Zzz overlays - Cherry Blossom themed Zzz? */}
      <g stroke="#ECA2B6" strokeWidth="1.5" strokeDasharray="2 3" strokeLinecap="round" opacity="0.8">
        <circle className="tokki-snore tokki-snore--a" cx="120" cy="62" r="5.5" fill="none" />
        <circle className="tokki-snore tokki-snore--b" cx="130" cy="50" r="3.5" fill="none" />
      </g>
      <text className="tokki-zzz tokki-zzz--a" x="122" y="58" fontSize="13" fontWeight="900" fill="#D93D6B">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="132" y="44" fontSize="18" fontWeight="900" fill="#D93D6B">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="140" y="26" fontSize="24" fontWeight="900" fill="#D93D6B">Z</text>

      {/* Front Paws - Resting over the belly nicely */}
      <ellipse className="tokki-paw tokki-paw--left" cx="64" cy="116" rx="14" ry="12" fill="url(#r2-paw)" filter="url(#r2-soft-bevel)" />
      <ellipse className="tokki-paw tokki-paw--right" cx="96" cy="116" rx="14" ry="12" fill="url(#r2-paw)" filter="url(#r2-soft-bevel)" />
      
      {/* Front toes */}
      <path d="M 58 122 L 58 126" stroke="#ECA2B6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 64 124 L 64 127" stroke="#ECA2B6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 70 122 L 70 126" stroke="#ECA2B6" strokeWidth="1.5" strokeLinecap="round" />
      
      <path d="M 90 122 L 90 126" stroke="#ECA2B6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 96 124 L 96 127" stroke="#ECA2B6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 102 122 L 102 126" stroke="#ECA2B6" strokeWidth="1.5" strokeLinecap="round" />

      {/* Big Back Paws/Feet with adorable toe beans */}
      <ellipse cx="60" cy="132" rx="18" ry="10" fill="url(#r2-paw)" filter="url(#r2-soft-bevel)" />
      <ellipse cx="100" cy="132" rx="18" ry="10" fill="url(#r2-paw)" filter="url(#r2-soft-bevel)" />

      {/* Squishy pink beans on the feet! (Darker pink) */}
      <g opacity="0.9">
        <circle cx="50" cy="132" r="2" fill="url(#r2-pad)" />
        <circle cx="56" cy="134" r="2.5" fill="url(#r2-pad)" />
        <circle cx="62" cy="132" r="2" fill="url(#r2-pad)" />
        <ellipse cx="68" cy="131" rx="4" ry="3" fill="url(#r2-pad)" />

        <circle cx="110" cy="132" r="2" fill="url(#r2-pad)" />
        <circle cx="104" cy="134" r="2.5" fill="url(#r2-pad)" />
        <circle cx="98" cy="132" r="2" fill="url(#r2-pad)" />
        <ellipse cx="92" cy="131" rx="4" ry="3" fill="url(#r2-pad)" />
      </g>

      {/* Fluffy Tail */}
      <circle className="tokki-tail" cx="120" cy="120" r="14" fill="url(#r2-body)" filter="url(#r2-soft-bevel)" />
      <circle cx="116" cy="116" r="6" fill="#FFFFFF" opacity="0.8" filter="url(#r2-glow-faint)" />

      {/* Decorative environment petals scattered */}
      <use href="#r2-petal" x="30" y="25" opacity="0.8" transform="rotate(-15 30 25)" />
      <use href="#r2-petal" x="135" y="20" opacity="0.7" transform="rotate(25 135 20)" />
      <use href="#r2-petal" x="18" y="70" opacity="0.6" transform="rotate(10 18 70)" />
      <use href="#r2-petal" x="145" y="80" opacity="0.5" transform="rotate(-25 145 80)" />
    </svg>
  );
}

export default RabbitV2Asset;

registerAvatar({
  id: "rabbit_v2",
  label: "Rabbit \u2740",
  emoji: "\u{1F430}",
  cssClass: "tokki-asset--rabbit-v2",
  accentColor: "#F5B7C5",
  Component: RabbitV2Asset,
  fx: {
    surprised: { particle: "petal", count: [4, 7], zone: { x: [20, 140], y: [10, 100] }, intensity: 0.8 },
    playful: { particle: "petal", count: [2, 4], zone: { x: [40, 120], y: [20, 80] }, intensity: 0.5 },
  },
});
