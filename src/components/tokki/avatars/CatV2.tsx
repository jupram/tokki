import { registerAvatar } from "./index";

function CatV2Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--cat-v2"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Body gradient — deep blue-black Bastet body */}
        <radialGradient id="c2-body" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#2A2A4E" />
          <stop offset="100%" stopColor="#1A1A2E" />
        </radialGradient>

        {/* Belly — slightly lighter midnight */}
        <radialGradient id="c2-belly" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#2E2E52" />
          <stop offset="100%" stopColor="#1E1E38" />
        </radialGradient>

        {/* Inner ear — deep amethyst with gold hint */}
        <radialGradient id="c2-ear-inner" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#D4A833" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#3A2A5A" />
        </radialGradient>

        {/* Gold accent gradient — regal metallic gold */}
        <linearGradient id="c2-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2D06B" />
          <stop offset="40%" stopColor="#D4A833" />
          <stop offset="100%" stopColor="#A07820" />
        </linearGradient>

        {/* Gold shimmer for collar */}
        <linearGradient id="c2-collar-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#A07820" />
          <stop offset="25%" stopColor="#F2D06B" />
          <stop offset="50%" stopColor="#D4A833" />
          <stop offset="75%" stopColor="#F2D06B" />
          <stop offset="100%" stopColor="#A07820" />
        </linearGradient>

        {/* Eye glow — golden-amber for kohl-lined eyes */}
        <radialGradient id="c2-eye" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#F5E06B" />
          <stop offset="60%" stopColor="#D4A833" />
          <stop offset="100%" stopColor="#B08A20" />
        </radialGradient>

        {/* Kohl eye outline gradient */}
        <linearGradient id="c2-kohl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0A0A14" />
          <stop offset="100%" stopColor="#1A1A2E" />
        </linearGradient>

        {/* Cheek — subtle gold warmth */}
        <radialGradient id="c2-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4A833" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#D4A833" stopOpacity="0" />
        </radialGradient>

        {/* Paw gradient */}
        <radialGradient id="c2-paw" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#2A2A4E" />
          <stop offset="100%" stopColor="#1A1A2E" />
        </radialGradient>

        {/* Forehead Eye-of-Horus glow */}
        <radialGradient id="c2-horus-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4A833" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#D4A833" stopOpacity="0" />
        </radialGradient>

        {/* Gold body marking gradient */}
        <linearGradient id="c2-marking" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4A833" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#D4A833" stopOpacity="0.08" />
        </linearGradient>

        {/* Nose gradient */}
        <linearGradient id="c2-nose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4A833" />
          <stop offset="100%" stopColor="#A07820" />
        </linearGradient>
      </defs>

      {/* ── Shadow ── */}
      <ellipse className="tokki-shadow" cx="80" cy="141" rx="34" ry="6" />

      {/* ── Tail (behind body) — long elegant S-curve ── */}
      <path
        className="tokki-tail"
        d="M106 114 Q130 104 130 82 Q130 62 136 50 Q140 42 138 36"
        fill="none"
        stroke="url(#c2-body)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M106 114 Q130 104 130 82 Q130 62 136 50 Q140 42 138 36"
        fill="none"
        stroke="rgba(212,168,51,0.18)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Gold band on tail tip */}
      <path
        d="M137 42 Q139 38 137 35"
        fill="none"
        stroke="#D4A833"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* ── Body — sleek elongated torso ── */}
      <ellipse
        className="tokki-body"
        cx="80"
        cy="110"
        rx="24"
        ry="24"
        fill="url(#c2-body)"
        stroke="rgba(212,168,51,0.18)"
        strokeWidth="1.5"
      />
      {/* Inner belly — subtle lighter panel */}
      <ellipse cx="80" cy="114" rx="13" ry="13" fill="url(#c2-belly)" opacity="0.6" />

      {/* ── Gold geometric body markings ── */}
      {/* Chevron patterns on chest */}
      <path
        d="M70 100 L80 94 L90 100"
        fill="none"
        stroke="url(#c2-marking)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M68 105 L80 98 L92 105"
        fill="none"
        stroke="url(#c2-marking)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Diamond accent on belly */}
      <path
        d="M80 107 L84 112 L80 117 L76 112 Z"
        fill="none"
        stroke="#D4A833"
        strokeWidth="1"
        opacity="0.3"
      />
      {/* Small dots flanking diamond */}
      <circle cx="72" cy="112" r="1" fill="#D4A833" opacity="0.3" />
      <circle cx="88" cy="112" r="1" fill="#D4A833" opacity="0.3" />

      {/* ── Hind paws — visible below body ── */}
      <ellipse cx="68" cy="130" rx="10" ry="5" fill="url(#c2-paw)" stroke="rgba(212,168,51,0.14)" strokeWidth="1.2" />
      <ellipse cx="92" cy="130" rx="10" ry="5" fill="url(#c2-paw)" stroke="rgba(212,168,51,0.14)" strokeWidth="1.2" />
      {/* Gold toe bands */}
      <path d="M62 130 L65 129" stroke="#D4A833" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      <path d="M68 128 L68 129" stroke="#D4A833" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      <path d="M92 128 L92 129" stroke="#D4A833" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      <path d="M98 130 L95 129" stroke="#D4A833" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />

      {/* ── Ears — angular Egyptian-style, sharper triangles ── */}
      <g className="tokki-ear tokki-ear--left">
        <polygon
          className="tokki-ear-shell"
          points="50,54 28,8 70,42"
          fill="url(#c2-body)"
          stroke="rgba(212,168,51,0.25)"
          strokeWidth="1.8"
          strokeLinejoin="miter"
        />
        <polygon
          className="tokki-ear-inner"
          points="50,48 35,18 64,42"
          fill="url(#c2-ear-inner)"
        />
        {/* Gold edge accent on ear */}
        <line x1="28" y1="8" x2="50" y2="54" stroke="#D4A833" strokeWidth="1" opacity="0.35" />
      </g>
      <g className="tokki-ear tokki-ear--right">
        <polygon
          className="tokki-ear-shell"
          points="110,54 132,8 90,42"
          fill="url(#c2-body)"
          stroke="rgba(212,168,51,0.25)"
          strokeWidth="1.8"
          strokeLinejoin="miter"
        />
        <polygon
          className="tokki-ear-inner"
          points="110,48 125,18 96,42"
          fill="url(#c2-ear-inner)"
        />
        {/* Gold edge accent on ear */}
        <line x1="132" y1="8" x2="110" y2="54" stroke="#D4A833" strokeWidth="1" opacity="0.35" />
      </g>

      {/* ── Head — slightly elongated, regal ── */}
      <ellipse
        className="tokki-head"
        cx="80"
        cy="70"
        rx="36"
        ry="34"
        fill="url(#c2-body)"
        stroke="rgba(212,168,51,0.2)"
        strokeWidth="1.8"
      />

      {/* ── Forehead — Eye of Horus simplified glyph ── */}
      <g opacity="0.45">
        {/* Subtle glow behind the glyph */}
        <circle cx="80" cy="54" r="8" fill="url(#c2-horus-glow)" />
        {/* Central eye shape */}
        <ellipse cx="80" cy="54" rx="5" ry="2.5" fill="none" stroke="#D4A833" strokeWidth="1.2" />
        {/* Pupil dot */}
        <circle cx="80" cy="54" r="1.2" fill="#D4A833" />
        {/* Teardrop line descending from eye */}
        <path d="M80 56.5 Q79 60 78 63" fill="none" stroke="#D4A833" strokeWidth="1" strokeLinecap="round" />
        {/* Brow arch */}
        <path d="M74 52 Q80 49 86 52" fill="none" stroke="#D4A833" strokeWidth="1" strokeLinecap="round" />
        {/* Spiral curl at end of brow — art deco flair */}
        <path d="M86 52 Q88 53 87 55" fill="none" stroke="#D4A833" strokeWidth="0.8" strokeLinecap="round" />
      </g>

      {/* ── Gold geometric forehead lines ── */}
      <path d="M66 58 L72 55" fill="none" stroke="#D4A833" strokeWidth="0.8" opacity="0.3" strokeLinecap="round" />
      <path d="M94 58 L88 55" fill="none" stroke="#D4A833" strokeWidth="0.8" opacity="0.3" strokeLinecap="round" />

      {/* ── Eyes — kohl-lined almond shape, Egyptian style ── */}
      <g className="tokki-eye tokki-eye--left">
        {/* Thick outer kohl line — almond shape with extended wings */}
        <path
          d="M53 69 Q58 63 66 63 Q74 63 78 69 Q74 74 66 74 Q58 74 53 69 Z"
          fill="url(#c2-kohl)"
          stroke="#0A0A14"
          strokeWidth="2"
        />
        {/* Extended kohl wing — classic Egyptian eye flick */}
        <path
          d="M53 69 L47 66"
          stroke="#0A0A14"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Inner eye — golden amber iris */}
        <ellipse cx="66" cy="69" rx="7" ry="5" fill="url(#c2-eye)" />
        {/* Vertical slit pupil */}
        <ellipse cx="66" cy="69" rx="1.8" ry="4.5" fill="#0A0A14" />
        {/* Highlight */}
        <ellipse cx="64.5" cy="67.5" rx="1.8" ry="1.5" fill="#fff" opacity="0.75" />
        {/* Second small highlight */}
        <circle cx="68" cy="71" r="0.8" fill="#fff" opacity="0.4" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        {/* Thick outer kohl line — almond shape with extended wings */}
        <path
          d="M82 69 Q86 63 94 63 Q102 63 107 69 Q102 74 94 74 Q86 74 82 69 Z"
          fill="url(#c2-kohl)"
          stroke="#0A0A14"
          strokeWidth="2"
        />
        {/* Extended kohl wing */}
        <path
          d="M107 69 L113 66"
          stroke="#0A0A14"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Inner eye — golden amber iris */}
        <ellipse cx="94" cy="69" rx="7" ry="5" fill="url(#c2-eye)" />
        {/* Vertical slit pupil */}
        <ellipse cx="94" cy="69" rx="1.8" ry="4.5" fill="#0A0A14" />
        {/* Highlight */}
        <ellipse cx="92.5" cy="67.5" rx="1.8" ry="1.5" fill="#fff" opacity="0.75" />
        {/* Second small highlight */}
        <circle cx="96" cy="71" r="0.8" fill="#fff" opacity="0.4" />
      </g>

      {/* ── Whiskers — fine and elegant ── */}
      <g className="tokki-whisker" opacity="0.3" stroke="#D4A833" strokeWidth="0.8" fill="none" strokeLinecap="round">
        <line x1="38" y1="76" x2="55" y2="77" />
        <line x1="36" y1="81" x2="54" y2="80" />
        <line x1="40" y1="86" x2="55" y2="83" />
        <line x1="105" y1="77" x2="122" y2="76" />
        <line x1="106" y1="80" x2="124" y2="81" />
        <line x1="105" y1="83" x2="120" y2="86" />
      </g>

      {/* ── Cheeks — warm gold glow ── */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="54" cy="79" rx="6" ry="4" fill="url(#c2-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="106" cy="79" rx="6" ry="4" fill="url(#c2-cheek)" />

      {/* ── Nose — small inverted triangle, gold-tipped ── */}
      <polygon
        className="tokki-nose"
        points="80,77 76.5,73 83.5,73"
        fill="url(#c2-nose)"
        stroke="rgba(10,10,20,0.3)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* ── Mouth — delicate Bastet smile ── */}
      <path
        className="tokki-mouth"
        d="M74 81 Q77 84.5 80 81 Q83 84.5 86 81"
        fill="none"
        stroke="#D4A833"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* ── Gold collar / necklace at neck — geometric art deco ── */}
      <g>
        {/* Main collar band */}
        <path
          d="M56 90 Q68 96 80 96 Q92 96 104 90"
          fill="none"
          stroke="url(#c2-collar-gold)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        {/* Second parallel line — art deco double band */}
        <path
          d="M58 93 Q68 98.5 80 98.5 Q92 98.5 102 93"
          fill="none"
          stroke="url(#c2-collar-gold)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Center pendant — small ankh */}
        <g transform="translate(80,100)" opacity="0.85">
          {/* Ankh loop */}
          <ellipse cx="0" cy="-2" rx="2.5" ry="3" fill="none" stroke="#D4A833" strokeWidth="1.2" />
          {/* Ankh vertical bar */}
          <line x1="0" y1="1" x2="0" y2="6" stroke="#D4A833" strokeWidth="1.2" />
          {/* Ankh crossbar */}
          <line x1="-2.5" y1="3" x2="2.5" y2="3" stroke="#D4A833" strokeWidth="1.2" />
        </g>
        {/* Geometric beads along collar */}
        <circle cx="64" cy="94" r="1.3" fill="#D4A833" opacity="0.6" />
        <circle cx="70" cy="95.5" r="1" fill="#F2D06B" opacity="0.5" />
        <circle cx="90" cy="95.5" r="1" fill="#F2D06B" opacity="0.5" />
        <circle cx="96" cy="94" r="1.3" fill="#D4A833" opacity="0.6" />
        {/* Small diamond accents */}
        <path d="M74 95 L75.5 96.5 L74 98 L72.5 96.5 Z" fill="#D4A833" opacity="0.4" />
        <path d="M86 95 L87.5 96.5 L86 98 L84.5 96.5 Z" fill="#D4A833" opacity="0.4" />
      </g>

      {/* ── Front paws — sleek with gold bands ── */}
      <ellipse
        className="tokki-paw tokki-paw--left"
        cx="64"
        cy="110"
        rx="10"
        ry="7"
        fill="url(#c2-paw)"
        stroke="rgba(212,168,51,0.2)"
        strokeWidth="1.4"
      />
      <ellipse
        className="tokki-paw tokki-paw--right"
        cx="96"
        cy="110"
        rx="10"
        ry="7"
        fill="url(#c2-paw)"
        stroke="rgba(212,168,51,0.2)"
        strokeWidth="1.4"
      />
      {/* Gold bracelet bands on front paws */}
      <path d="M57 108 Q64 105 71 108" fill="none" stroke="#D4A833" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
      <path d="M89 108 Q96 105 103 108" fill="none" stroke="#D4A833" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
      {/* Toe pads — faint gold */}
      <ellipse cx="62" cy="112" rx="2" ry="1.5" fill="#D4A833" opacity="0.15" />
      <ellipse cx="66" cy="112" rx="2" ry="1.5" fill="#D4A833" opacity="0.15" />
      <ellipse cx="64" cy="114.5" rx="2.5" ry="1.8" fill="#D4A833" opacity="0.12" />
      <ellipse cx="94" cy="112" rx="2" ry="1.5" fill="#D4A833" opacity="0.15" />
      <ellipse cx="98" cy="112" rx="2" ry="1.5" fill="#D4A833" opacity="0.15" />
      <ellipse cx="96" cy="114.5" rx="2.5" ry="1.8" fill="#D4A833" opacity="0.12" />

      {/* ── Zzz / Snore elements (shown during sleep state) ── */}
      <circle className="tokki-snore tokki-snore--a" cx="116" cy="62" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="123" cy="53" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="118" y="59" fontSize="10" fontWeight="bold" fill="#D4A833">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="126" y="47" fontSize="13" fontWeight="bold" fill="#D4A833">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="132" y="34" fontSize="16" fontWeight="bold" fill="#D4A833">Z</text>
    </svg>
  );
}

registerAvatar({
  id: "cat_v2",
  label: "Cat \u2726",
  emoji: "\u{1F431}",
  cssClass: "tokki-asset--cat-v2",
  Component: CatV2Asset,
  fx: {},
});
