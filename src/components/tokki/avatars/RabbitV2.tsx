import { registerAvatar } from "./index";

function RabbitV2Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--rabbit-v2"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* ── Gradients ────────────────────────────────── */}
        <radialGradient id="r2-body" cx="50%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#FFF5E8" />
          <stop offset="70%" stopColor="#FFEFD5" />
          <stop offset="100%" stopColor="#FFE4C2" />
        </radialGradient>

        <radialGradient id="r2-ear-inner" cx="50%" cy="25%" r="65%">
          <stop offset="0%" stopColor="#F5B7C5" />
          <stop offset="60%" stopColor="#F0A0B4" />
          <stop offset="100%" stopColor="#E88DA3" />
        </radialGradient>

        <radialGradient id="r2-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5B7C5" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#F5B7C5" stopOpacity="0.15" />
        </radialGradient>

        <radialGradient id="r2-paw" cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#FFF5E8" />
          <stop offset="100%" stopColor="#FFDDB8" />
        </radialGradient>

        <radialGradient id="r2-nose" cx="45%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#F0A0B4" />
          <stop offset="100%" stopColor="#E88DA3" />
        </radialGradient>

        <radialGradient id="r2-blossom" cx="40%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#FFD6E0" />
          <stop offset="100%" stopColor="#F5B7C5" />
        </radialGradient>

        <radialGradient id="r2-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5a3018" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#5a3018" stopOpacity="0.02" />
        </radialGradient>

        {/* ── Brush-stroke texture filter (ukiyo-e hand-painted edges) ── */}
        <filter id="r2-brush" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="turbulence" baseFrequency="0.04 0.08" numOctaves="4" seed="42" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Softer brush filter for smaller elements */}
        <filter id="r2-brush-soft" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="turbulence" baseFrequency="0.06 0.1" numOctaves="3" seed="17" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Soft drop shadow for depth */}
        <filter id="r2-soft-shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dy="2" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2={-1} k3={1} />
          <feFlood floodColor="#5a3018" floodOpacity="0.08" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ── Sakura blossom stamp (reusable 5-petal flower) ── */}
        <g id="r2-sakura">
          <ellipse cx="0" cy="-3.2" rx="1.6" ry="3.2" fill="url(#r2-blossom)" opacity="0.85" />
          <ellipse cx="3" cy="-1" rx="1.6" ry="3.2" fill="url(#r2-blossom)" opacity="0.85" transform="rotate(72 3 -1)" />
          <ellipse cx="1.9" cy="2.6" rx="1.6" ry="3.2" fill="url(#r2-blossom)" opacity="0.85" transform="rotate(144 1.9 2.6)" />
          <ellipse cx="-1.9" cy="2.6" rx="1.6" ry="3.2" fill="url(#r2-blossom)" opacity="0.85" transform="rotate(216 -1.9 2.6)" />
          <ellipse cx="-3" cy="-1" rx="1.6" ry="3.2" fill="url(#r2-blossom)" opacity="0.85" transform="rotate(288 -3 -1)" />
          <circle cx="0" cy="0" r="1.3" fill="#F5B7C5" opacity="0.9" />
        </g>

        {/* Smaller blossom for ear patterns */}
        <g id="r2-sakura-sm">
          <ellipse cx="0" cy="-2" rx="1" ry="2" fill="url(#r2-blossom)" opacity="0.8" />
          <ellipse cx="1.9" cy="-0.6" rx="1" ry="2" fill="url(#r2-blossom)" opacity="0.8" transform="rotate(72 1.9 -0.6)" />
          <ellipse cx="1.2" cy="1.6" rx="1" ry="2" fill="url(#r2-blossom)" opacity="0.8" transform="rotate(144 1.2 1.6)" />
          <ellipse cx="-1.2" cy="1.6" rx="1" ry="2" fill="url(#r2-blossom)" opacity="0.8" transform="rotate(216 -1.2 1.6)" />
          <ellipse cx="-1.9" cy="-0.6" rx="1" ry="2" fill="url(#r2-blossom)" opacity="0.8" transform="rotate(288 -1.9 -0.6)" />
          <circle cx="0" cy="0" r="0.8" fill="#E88DA3" opacity="0.9" />
        </g>
      </defs>

      {/* ── Ground shadow ──────────────────────────────── */}
      <ellipse className="tokki-shadow" cx="80" cy="140" rx="38" ry="8" fill="url(#r2-shadow)" />

      {/* ── Body (very round, larger than v1) ──────────── */}
      <ellipse
        className="tokki-body"
        cx="80" cy="108" rx="32" ry="26"
        fill="url(#r2-body)"
        stroke="rgba(58,30,18,0.14)"
        strokeWidth="1.4"
        filter="url(#r2-brush)"
      />

      {/* Body blossom motifs — decorative sakura scattered on torso */}
      <use href="#r2-sakura-sm" x="66" y="98" opacity="0.35" />
      <use href="#r2-sakura-sm" x="94" y="102" opacity="0.3" />
      <use href="#r2-sakura-sm" x="78" y="116" opacity="0.25" />

      {/* ── Ears (massive — 40% of total height) ───────── */}
      {/* Left ear */}
      <g className="tokki-ear tokki-ear--left" filter="url(#r2-soft-shadow)">
        <ellipse
          className="tokki-ear-shell"
          cx="54" cy="28" rx="16" ry="38"
          fill="url(#r2-body)"
          stroke="rgba(58,30,18,0.18)"
          strokeWidth="1.6"
          filter="url(#r2-brush)"
        />
        <ellipse
          className="tokki-ear-inner"
          cx="54" cy="28" rx="9" ry="26"
          fill="url(#r2-ear-inner)"
          filter="url(#r2-brush-soft)"
        />
        {/* Sakura blossoms on inner ear */}
        <use href="#r2-sakura-sm" x="51" y="18" opacity="0.6" />
        <use href="#r2-sakura-sm" x="57" y="30" opacity="0.5" />
        <use href="#r2-sakura-sm" x="52" y="42" opacity="0.4" />
      </g>

      {/* Right ear */}
      <g className="tokki-ear tokki-ear--right" filter="url(#r2-soft-shadow)">
        <ellipse
          className="tokki-ear-shell"
          cx="106" cy="28" rx="16" ry="38"
          fill="url(#r2-body)"
          stroke="rgba(58,30,18,0.18)"
          strokeWidth="1.6"
          filter="url(#r2-brush)"
        />
        <ellipse
          className="tokki-ear-inner"
          cx="106" cy="28" rx="9" ry="26"
          fill="url(#r2-ear-inner)"
          filter="url(#r2-brush-soft)"
        />
        {/* Sakura blossoms on inner ear */}
        <use href="#r2-sakura-sm" x="103" y="18" opacity="0.6" />
        <use href="#r2-sakura-sm" x="109" y="30" opacity="0.5" />
        <use href="#r2-sakura-sm" x="104" y="42" opacity="0.4" />
      </g>

      {/* ── Head (round, warm cream) ───────────────────── */}
      <circle
        className="tokki-head"
        cx="80" cy="74" r="40"
        fill="url(#r2-body)"
        stroke="rgba(58,30,18,0.18)"
        strokeWidth="1.6"
        filter="url(#r2-brush)"
      />

      {/* Highlight reflections on head */}
      <ellipse cx="66" cy="58" rx="12" ry="7" fill="#fff" opacity="0.12" />
      <ellipse cx="56" cy="52" rx="3.5" ry="5.5" fill="#fff8f0" opacity="0.4" />
      <ellipse cx="104" cy="52" rx="3.5" ry="5.5" fill="#fff8f0" opacity="0.4" />

      {/* Small decorative blossom on forehead */}
      <use href="#r2-sakura-sm" x="80" y="54" opacity="0.3" />

      {/* ── Eyes (expressive, ink-like) ─────────────────── */}
      <g className="tokki-eye tokki-eye--left">
        <ellipse cx="67" cy="72" rx="5.5" ry="6.5" fill="#1a0e08" />
        {/* Ukiyo-e ink reflections — multiple highlights */}
        <ellipse cx="65" cy="69.5" rx="2.4" ry="2.8" fill="#fff" opacity="0.9" />
        <ellipse cx="69" cy="74" rx="1.2" ry="1.2" fill="#fff" opacity="0.45" />
        <ellipse cx="66" cy="75" rx="0.7" ry="0.5" fill="#fff" opacity="0.2" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="93" cy="72" rx="5.5" ry="6.5" fill="#1a0e08" />
        <ellipse cx="91" cy="69.5" rx="2.4" ry="2.8" fill="#fff" opacity="0.9" />
        <ellipse cx="95" cy="74" rx="1.2" ry="1.2" fill="#fff" opacity="0.45" />
        <ellipse cx="92" cy="75" rx="0.7" ry="0.5" fill="#fff" opacity="0.2" />
      </g>

      {/* Eyebrows — soft brush arcs */}
      <path d="M61 63 Q67 59.5 73 62" fill="none" stroke="#5a3c2e" strokeWidth="1.2" opacity="0.2" strokeLinecap="round" filter="url(#r2-brush-soft)" />
      <path d="M87 62 Q93 59.5 99 63" fill="none" stroke="#5a3c2e" strokeWidth="1.2" opacity="0.2" strokeLinecap="round" filter="url(#r2-brush-soft)" />

      {/* ── Cheeks (sakura pink blush) ──────────────────── */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="56" cy="82" rx="9" ry="5.5" fill="url(#r2-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="104" cy="82" rx="9" ry="5.5" fill="url(#r2-cheek)" />

      {/* ── Nose (sakura pink, rounded triangle) ───────── */}
      <ellipse className="tokki-nose" cx="80" cy="79" rx="3.8" ry="2.8" fill="url(#r2-nose)" />
      {/* Nose highlight */}
      <ellipse cx="79" cy="78" rx="1.2" ry="0.8" fill="#fff" opacity="0.35" />

      {/* ── Mouth (brush-stroke style) ─────────────────── */}
      <path
        className="tokki-mouth"
        d="M72 84.5 Q76 90 80 90 Q84 90 88 84.5"
        fill="none"
        stroke="#5a3018"
        strokeWidth="1.8"
        strokeLinecap="round"
        filter="url(#r2-brush-soft)"
      />

      {/* Bunny teeth */}
      <rect x="77.2" y="84.5" width="2.5" height="3.5" rx="1.1" fill="#fff" stroke="rgba(58,30,18,0.12)" strokeWidth="0.5" />
      <rect x="80.3" y="84.5" width="2.5" height="3.5" rx="1.1" fill="#fff" stroke="rgba(58,30,18,0.12)" strokeWidth="0.5" />

      {/* ── Whiskers (delicate brush marks) ─────────────── */}
      <line x1="45" y1="77" x2="58" y2="79" stroke="#5a3018" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />
      <line x1="44" y1="82" x2="57" y2="82" stroke="#5a3018" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />
      <line x1="45" y1="87" x2="58" y2="85" stroke="#5a3018" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />
      <line x1="102" y1="79" x2="115" y2="77" stroke="#5a3018" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />
      <line x1="103" y1="82" x2="116" y2="82" stroke="#5a3018" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />
      <line x1="102" y1="85" x2="115" y2="87" stroke="#5a3018" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />

      {/* ── Zzz / Snore elements ───────────────────────── */}
      <circle className="tokki-snore tokki-snore--a" cx="118" cy="66" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="125" cy="56" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="120" y="63" fontSize="10" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="128" y="50" fontSize="13" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="134" y="37" fontSize="16" fontWeight="bold" fill="#8b7e74">Z</text>

      {/* ── Front paws (with pink bean toes) ───────────── */}
      <ellipse
        className="tokki-paw tokki-paw--left"
        cx="62" cy="106" rx="12" ry="10"
        fill="url(#r2-paw)"
        stroke="rgba(58,30,18,0.15)"
        strokeWidth="1.3"
        filter="url(#r2-brush-soft)"
      />
      <ellipse
        className="tokki-paw tokki-paw--right"
        cx="98" cy="106" rx="12" ry="10"
        fill="url(#r2-paw)"
        stroke="rgba(58,30,18,0.15)"
        strokeWidth="1.3"
        filter="url(#r2-brush-soft)"
      />

      {/* Left paw — bean toe pads (4 small + 1 main pad) */}
      <ellipse cx="57" cy="107" rx="2.5" ry="2" fill="#F5B7C5" opacity="0.5" />
      <ellipse cx="61" cy="105" rx="2.5" ry="2" fill="#F5B7C5" opacity="0.5" />
      <ellipse cx="65" cy="107" rx="2.5" ry="2" fill="#F5B7C5" opacity="0.5" />
      <ellipse cx="68" cy="109.5" rx="2" ry="1.6" fill="#F5B7C5" opacity="0.4" />
      <ellipse cx="61" cy="110" rx="4" ry="3" fill="#F5B7C5" opacity="0.35" />

      {/* Right paw — bean toe pads */}
      <ellipse cx="93" cy="107" rx="2.5" ry="2" fill="#F5B7C5" opacity="0.5" />
      <ellipse cx="97" cy="105" rx="2.5" ry="2" fill="#F5B7C5" opacity="0.5" />
      <ellipse cx="101" cy="107" rx="2.5" ry="2" fill="#F5B7C5" opacity="0.5" />
      <ellipse cx="90" cy="109.5" rx="2" ry="1.6" fill="#F5B7C5" opacity="0.4" />
      <ellipse cx="97" cy="110" rx="4" ry="3" fill="#F5B7C5" opacity="0.35" />

      {/* ── Back paws / feet ───────────────────────────── */}
      <ellipse cx="66" cy="129" rx="12" ry="6.5" fill="url(#r2-paw)" stroke="rgba(58,30,18,0.14)" strokeWidth="1.2" filter="url(#r2-brush-soft)" />
      <ellipse cx="94" cy="129" rx="12" ry="6.5" fill="url(#r2-paw)" stroke="rgba(58,30,18,0.14)" strokeWidth="1.2" filter="url(#r2-brush-soft)" />

      {/* Foot toe detail */}
      <ellipse cx="60" cy="129" rx="2" ry="1.5" fill="#F5B7C5" opacity="0.35" />
      <ellipse cx="65" cy="128" rx="2" ry="1.5" fill="#F5B7C5" opacity="0.35" />
      <ellipse cx="70" cy="129" rx="2" ry="1.5" fill="#F5B7C5" opacity="0.35" />
      <ellipse cx="88" cy="129" rx="2" ry="1.5" fill="#F5B7C5" opacity="0.35" />
      <ellipse cx="93" cy="128" rx="2" ry="1.5" fill="#F5B7C5" opacity="0.35" />
      <ellipse cx="98" cy="129" rx="2" ry="1.5" fill="#F5B7C5" opacity="0.35" />

      {/* ── Tail (fluffy pom) ──────────────────────────── */}
      <circle
        className="tokki-tail"
        cx="110" cy="118" r="9"
        fill="url(#r2-body)"
        stroke="rgba(58,30,18,0.12)"
        strokeWidth="1.1"
        filter="url(#r2-brush-soft)"
      />
      {/* Tail highlight */}
      <ellipse cx="108" cy="115" rx="3" ry="2.5" fill="#fff" opacity="0.15" />

      {/* ── Floating sakura blossoms (decorative accents) ─ */}
      <use href="#r2-sakura" x="22" y="22" opacity="0.25" transform="rotate(-15 22 22)" />
      <use href="#r2-sakura" x="138" y="16" opacity="0.2" transform="rotate(20 138 16)" />
      <use href="#r2-sakura-sm" x="14" y="62" opacity="0.18" transform="rotate(10 14 62)" />
      <use href="#r2-sakura-sm" x="146" y="72" opacity="0.15" transform="rotate(-25 146 72)" />
    </svg>
  );
}

registerAvatar({
  id: "rabbit_v2",
  label: "Rabbit \u2740",
  emoji: "\u{1F430}",
  cssClass: "tokki-asset--rabbit-v2",
  Component: RabbitV2Asset,
  fx: {
    surprised: { particle: "petal", count: [4, 7], zone: { x: [20, 140], y: [10, 100] }, intensity: 0.8 },
    playful: { particle: "petal", count: [2, 4], zone: { x: [40, 120], y: [20, 80] }, intensity: 0.5 },
  },
});
