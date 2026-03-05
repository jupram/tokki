import { registerAvatar } from "./index";

function SerpentV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--serpent"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Body gradient — deep obsidian to turquoise shimmer */}
        <radialGradient id="sp-body" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#40C4AA" />
          <stop offset="60%" stopColor="#2E8A7A" />
          <stop offset="100%" stopColor="#2A2A3A" />
        </radialGradient>

        {/* Hood gradient — turquoise with golden edge */}
        <radialGradient id="sp-hood" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#40C4AA" />
          <stop offset="70%" stopColor="#339988" />
          <stop offset="100%" stopColor="#2A2A3A" />
        </radialGradient>

        {/* Head gradient — darker obsidian with turquoise hints */}
        <radialGradient id="sp-head" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#3A3A4E" />
          <stop offset="100%" stopColor="#2A2A3A" />
        </radialGradient>

        {/* Hypnotic eye gradient — spiraling gold */}
        <radialGradient id="sp-eye-gold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#D4A833" />
          <stop offset="100%" stopColor="#B08620" />
        </radialGradient>

        {/* Scale pattern — Aztec diamond motif */}
        <pattern id="sp-scales" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <polygon points="6,0 12,6 6,12 0,6" fill="none" stroke="#D4A833" strokeWidth="0.6" opacity="0.5" />
          <polygon points="6,2 10,6 6,10 2,6" fill="none" stroke="#40C4AA" strokeWidth="0.4" opacity="0.3" />
        </pattern>

        {/* Aztec step-fret pattern for hood border */}
        <pattern id="sp-fret" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0,4 L2,4 L2,2 L4,2 L4,0 L6,0 L6,2 L8,2 L8,4" fill="none" stroke="#D4A833" strokeWidth="0.7" opacity="0.65" />
        </pattern>

        {/* Gold accent gradient */}
        <linearGradient id="sp-gold-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#D4A833" />
          <stop offset="100%" stopColor="#B08620" />
        </linearGradient>

        {/* Belly/underside gradient — lighter turquoise */}
        <radialGradient id="sp-belly" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5BE0C8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#40C4AA" stopOpacity="0.2" />
        </radialGradient>

        {/* Rattle gradient */}
        <radialGradient id="sp-rattle" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#D4A833" />
          <stop offset="100%" stopColor="#9A7A20" />
        </radialGradient>

        {/* Tongue gradient */}
        <linearGradient id="sp-tongue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CC3333" />
          <stop offset="100%" stopColor="#991111" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse className="tokki-shadow" cx="80" cy="148" rx="42" ry="7" />

      {/* ===== COILED BODY ===== */}
      {/* Outer coil — thick spiral from bottom-center moving upward */}
      <g className="tokki-body">
        {/* Bottom coil ring */}
        <ellipse cx="80" cy="136" rx="38" ry="12" fill="url(#sp-body)" stroke="rgba(42,42,58,0.35)" strokeWidth="1.5" />
        {/* Belly highlight on bottom coil */}
        <ellipse cx="80" cy="134" rx="24" ry="6" fill="url(#sp-belly)" />

        {/* Middle coil ring — offset left */}
        <ellipse cx="74" cy="120" rx="32" ry="11" fill="url(#sp-body)" stroke="rgba(42,42,58,0.3)" strokeWidth="1.5" />
        <ellipse cx="74" cy="118" rx="20" ry="5.5" fill="url(#sp-belly)" />

        {/* Upper coil ring — offset right */}
        <ellipse cx="84" cy="106" rx="26" ry="10" fill="url(#sp-body)" stroke="rgba(42,42,58,0.3)" strokeWidth="1.5" />
        <ellipse cx="84" cy="104" rx="16" ry="5" fill="url(#sp-belly)" />

        {/* Aztec diamond scale overlay on coils */}
        <ellipse cx="80" cy="136" rx="36" ry="11" fill="url(#sp-scales)" />
        <ellipse cx="74" cy="120" rx="30" ry="10" fill="url(#sp-scales)" />
        <ellipse cx="84" cy="106" rx="24" ry="9" fill="url(#sp-scales)" />

        {/* Gold band accents between coil segments — Aztec banding */}
        <ellipse cx="78" cy="128" rx="22" ry="1.5" fill="url(#sp-gold-accent)" opacity="0.4" />
        <ellipse cx="80" cy="113" rx="18" ry="1.2" fill="url(#sp-gold-accent)" opacity="0.35" />

        {/* Neck — rising from upper coil to head */}
        <path
          d="M80 96 Q80 88 80 82"
          fill="none"
          stroke="url(#sp-body)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M80 96 Q80 88 80 82"
          fill="none"
          stroke="url(#sp-scales)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Neck outline */}
        <path
          d="M71 96 Q71 88 71 82"
          fill="none"
          stroke="rgba(42,42,58,0.2)"
          strokeWidth="0.8"
        />
        <path
          d="M89 96 Q89 88 89 82"
          fill="none"
          stroke="rgba(42,42,58,0.2)"
          strokeWidth="0.8"
        />
      </g>

      {/* ===== TAIL with rattle ===== */}
      <g className="tokki-tail">
        {/* Tail curving out from bottom-right of coil */}
        <path
          d="M118 136 Q130 132 136 122 Q140 114 136 108"
          fill="none"
          stroke="url(#sp-body)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M118 136 Q130 132 136 122 Q140 114 136 108"
          fill="none"
          stroke="url(#sp-scales)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Rattle segments */}
        <ellipse cx="135" cy="106" rx="5" ry="3.5" fill="url(#sp-rattle)" stroke="#9A7A20" strokeWidth="0.8" transform="rotate(-15 135 106)" />
        <ellipse cx="133" cy="101" rx="4" ry="3" fill="url(#sp-rattle)" stroke="#9A7A20" strokeWidth="0.7" transform="rotate(-10 133 101)" />
        <ellipse cx="132" cy="97" rx="3" ry="2.2" fill="url(#sp-rattle)" stroke="#9A7A20" strokeWidth="0.6" />
        {/* Rattle tip */}
        <circle cx="132" cy="94" r="1.5" fill="#D4A833" />
      </g>

      {/* ===== HOOD / COWL ===== */}
      <g className="tokki-hood">
        {/* Main hood flare — wide behind the head */}
        <path
          d="M38 72 Q34 50 48 36 Q60 28 80 26 Q100 28 112 36 Q126 50 122 72 Q116 80 108 84 Q100 86 80 86 Q60 86 52 84 Q44 80 38 72 Z"
          fill="url(#sp-hood)"
          stroke="rgba(42,42,58,0.3)"
          strokeWidth="1.5"
        />
        {/* Hood scale overlay */}
        <path
          d="M38 72 Q34 50 48 36 Q60 28 80 26 Q100 28 112 36 Q126 50 122 72 Q116 80 108 84 Q100 86 80 86 Q60 86 52 84 Q44 80 38 72 Z"
          fill="url(#sp-scales)"
        />
        {/* Gold border — Aztec step-fret along hood edge */}
        <path
          d="M40 70 Q36 50 50 38 Q62 30 80 28 Q98 30 110 38 Q124 50 120 70"
          fill="none"
          stroke="url(#sp-gold-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Inner gold fret detail */}
        <path
          d="M46 66 Q44 52 54 42 Q64 34 80 32 Q96 34 106 42 Q116 52 114 66"
          fill="none"
          stroke="#D4A833"
          strokeWidth="0.8"
          strokeDasharray="3 2"
          opacity="0.5"
        />
        {/* Aztec geometric markings on hood — diamond emblems */}
        <polygon points="50,52 54,48 58,52 54,56" fill="#D4A833" opacity="0.45" />
        <polygon points="102,52 106,48 110,52 106,56" fill="#D4A833" opacity="0.45" />
        {/* Center crest — Quetzalcoatl feather motif */}
        <polygon points="80,30 76,38 80,34 84,38" fill="#D4A833" opacity="0.6" />
        <polygon points="80,26 77,32 80,29 83,32" fill="#FFD700" opacity="0.5" />
      </g>

      {/* ===== HEAD — triangular, flat-topped ===== */}
      <g className="tokki-head">
        {/* Main head shape — wide-topped triangle with flat crown */}
        <path
          d="M56 76 L56 62 Q56 52 64 48 L96 48 Q104 52 104 62 L104 76 Q100 86 80 88 Q60 86 56 76 Z"
          fill="url(#sp-head)"
          stroke="rgba(42,42,58,0.35)"
          strokeWidth="1.5"
        />
        {/* Flat top accent line */}
        <line x1="64" y1="48" x2="96" y2="48" stroke="#D4A833" strokeWidth="1.2" opacity="0.6" />
        {/* Geometric head markings — center diamond */}
        <polygon points="80,50 76,56 80,62 84,56" fill="#40C4AA" opacity="0.35" />
        {/* Forehead step-fret lines */}
        <path d="M66,52 L70,52 L70,56 L74,56" fill="none" stroke="#D4A833" strokeWidth="0.7" opacity="0.4" />
        <path d="M94,52 L90,52 L90,56 L86,56" fill="none" stroke="#D4A833" strokeWidth="0.7" opacity="0.4" />
        {/* Brow ridges */}
        <path d="M60 62 Q64 58 72 60" fill="none" stroke="rgba(64,196,170,0.4)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M100 62 Q96 58 88 60" fill="none" stroke="rgba(64,196,170,0.4)" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* ===== HYPNOTIC EYES — gold with spiral patterns ===== */}
      <g className="tokki-eye tokki-eye--left">
        {/* Outer eye — golden glow */}
        <ellipse cx="68" cy="66" rx="7" ry="6.5" fill="url(#sp-eye-gold)" />
        <ellipse cx="68" cy="66" rx="7" ry="6.5" fill="none" stroke="rgba(42,42,58,0.4)" strokeWidth="1" />
        {/* Slit pupil — vertical obsidian */}
        <ellipse cx="68" cy="66" rx="1.8" ry="5.5" fill="#1A1A28" />
        {/* Hypnotic spiral rings */}
        <circle cx="68" cy="66" r="4.5" fill="none" stroke="#FFD700" strokeWidth="0.5" opacity="0.35" />
        <circle cx="68" cy="66" r="3" fill="none" stroke="#FFD700" strokeWidth="0.4" opacity="0.25" />
        {/* Highlight gleam */}
        <ellipse cx="66" cy="64" rx="1.8" ry="1.5" fill="#fff" opacity="0.7" />
        <ellipse cx="69.5" cy="68" rx="0.8" ry="0.7" fill="#fff" opacity="0.35" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="92" cy="66" rx="7" ry="6.5" fill="url(#sp-eye-gold)" />
        <ellipse cx="92" cy="66" rx="7" ry="6.5" fill="none" stroke="rgba(42,42,58,0.4)" strokeWidth="1" />
        <ellipse cx="92" cy="66" rx="1.8" ry="5.5" fill="#1A1A28" />
        <circle cx="92" cy="66" r="4.5" fill="none" stroke="#FFD700" strokeWidth="0.5" opacity="0.35" />
        <circle cx="92" cy="66" r="3" fill="none" stroke="#FFD700" strokeWidth="0.4" opacity="0.25" />
        <ellipse cx="90" cy="64" rx="1.8" ry="1.5" fill="#fff" opacity="0.7" />
        <ellipse cx="93.5" cy="68" rx="0.8" ry="0.7" fill="#fff" opacity="0.35" />
      </g>

      {/* ===== NOSE — subtle nostril slits ===== */}
      <ellipse cx="77" cy="76" rx="1.2" ry="0.8" fill="#1A1A28" opacity="0.6" />
      <ellipse cx="83" cy="76" rx="1.2" ry="0.8" fill="#1A1A28" opacity="0.6" />

      {/* ===== MOUTH ===== */}
      <path className="tokki-mouth" d="M72 80 Q76 83 80 82 Q84 83 88 80" fill="none" stroke="#40C4AA" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* ===== FORKED TONGUE ===== */}
      <g className="tokki-tongue">
        <path
          d="M80 82 L80 92 L76 97"
          fill="none"
          stroke="url(#sp-tongue)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M80 92 L84 97"
          fill="none"
          stroke="url(#sp-tongue)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      {/* ===== ZZZ / SNORE ELEMENTS ===== */}
      <circle className="tokki-snore tokki-snore--a" cx="118" cy="54" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="126" cy="44" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="120" y="51" fontSize="10" fontWeight="bold" fill="#5BE0C8">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="128" y="38" fontSize="13" fontWeight="bold" fill="#5BE0C8">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="134" y="26" fontSize="16" fontWeight="bold" fill="#5BE0C8">Z</text>
    </svg>
  );
}

registerAvatar({
  id: "serpent_v1",
  label: "Serpent",
  emoji: "\u{1F40D}",
  cssClass: "tokki-asset--serpent",
  Component: SerpentV1Asset,
  fx: {
    curious: { particle: "star", count: [3, 5], zone: { x: [30, 130], y: [40, 100] }, intensity: 0.6 },
  },
});
