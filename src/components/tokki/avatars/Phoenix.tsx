import { registerAvatar } from "./index";

function PhoenixV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--phoenix"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* === Body: crimson core fading to lapis blue edges === */}
        <radialGradient id="ph-body" cx="50%" cy="36%" r="58%">
          <stop offset="0%" stopColor="#C72D3C" />
          <stop offset="45%" stopColor="#D4A833" />
          <stop offset="100%" stopColor="#1A3A6A" />
        </radialGradient>

        {/* === Head: warm gold centre to crimson === */}
        <radialGradient id="ph-head" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#D4A833" />
          <stop offset="55%" stopColor="#C72D3C" />
          <stop offset="100%" stopColor="#1A3A6A" />
        </radialGradient>

        {/* === Wing sweep: lapis through turquoise to gold === */}
        <linearGradient id="ph-wing" x1="0" y1="0" x2="1" y2="0.55">
          <stop offset="0%" stopColor="#1A3A6A" />
          <stop offset="35%" stopColor="#1B8A8A" />
          <stop offset="70%" stopColor="#D4A833" />
          <stop offset="100%" stopColor="#C72D3C" />
        </linearGradient>

        {/* === Wing dark overlay === */}
        <linearGradient id="ph-wing-dark" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#0E2348" />
          <stop offset="100%" stopColor="#1A3A6A" />
        </linearGradient>

        {/* === Gold feather teardrop accents === */}
        <radialGradient id="ph-feather-gold" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#F0D060" />
          <stop offset="100%" stopColor="#B8922A" stopOpacity="0.6" />
        </radialGradient>

        {/* === Lapis feather teardrops === */}
        <radialGradient id="ph-feather-lapis" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#2A5A8A" />
          <stop offset="100%" stopColor="#1A3A6A" stopOpacity="0.7" />
        </radialGradient>

        {/* === Turquoise feather accents === */}
        <radialGradient id="ph-feather-turq" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#40C0B0" />
          <stop offset="100%" stopColor="#1B8A8A" stopOpacity="0.6" />
        </radialGradient>

        {/* === Crimson feather accents === */}
        <radialGradient id="ph-feather-crimson" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#E04050" />
          <stop offset="100%" stopColor="#A82030" stopOpacity="0.6" />
        </radialGradient>

        {/* === Crest flame: crimson base to gold to pale tip === */}
        <linearGradient id="ph-crest" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#C72D3C" />
          <stop offset="40%" stopColor="#D4A833" />
          <stop offset="80%" stopColor="#F0D060" />
          <stop offset="100%" stopColor="#FFF8D0" />
        </linearGradient>

        {/* === Tail plume: gold to crimson to lapis tip === */}
        <linearGradient id="ph-tail" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#D4A833" />
          <stop offset="35%" stopColor="#C72D3C" />
          <stop offset="70%" stopColor="#1B8A8A" />
          <stop offset="100%" stopColor="#1A3A6A" />
        </linearGradient>

        {/* === Eye warm glow === */}
        <radialGradient id="ph-eye-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF4C0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#C72D3C" stopOpacity="0" />
        </radialGradient>

        {/* === Beak: dark gold === */}
        <linearGradient id="ph-beak" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#D4A833" />
          <stop offset="100%" stopColor="#A07820" />
        </linearGradient>

        {/* === Cheek warmth === */}
        <radialGradient id="ph-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E04050" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#D4A833" stopOpacity="0.1" />
        </radialGradient>

        {/* === Breast feather overlay === */}
        <radialGradient id="ph-breast" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#FFF4C0" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#D4A833" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#C72D3C" stopOpacity="0" />
        </radialGradient>

        {/* === Talon gradient === */}
        <radialGradient id="ph-talon" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#B8922A" />
          <stop offset="100%" stopColor="#7A5A14" />
        </radialGradient>

        {/* === Persian border decorative gradient === */}
        <linearGradient id="ph-border" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#D4A833" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#1B8A8A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4A833" stopOpacity="0.6" />
        </linearGradient>

        {/* === Soft flame glow filter === */}
        <filter id="ph-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dy="0" />
          <feFlood floodColor="#C72D3C" floodOpacity="0.2" />
          <feComposite in2="SourceAlpha" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* === Subtle shimmer for gold elements === */}
        <filter id="ph-shimmer" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
        </filter>
      </defs>

      {/* ================================================================ */}
      {/*  GROUND SHADOW                                                    */}
      {/* ================================================================ */}
      <ellipse className="tokki-shadow" cx="80" cy="148" rx="36" ry="6" />

      {/* ================================================================ */}
      {/*  TAIL PLUMES (behind body) -- three graceful feathers              */}
      {/* ================================================================ */}
      <g className="tokki-tail">
        {/* Centre plume -- longest, flowing curve */}
        <path
          d="M80 118 Q83 132 79 142 Q77 150 80 158"
          fill="none" stroke="url(#ph-tail)" strokeWidth="5.5" strokeLinecap="round"
        />
        <path
          d="M80 118 Q83 132 79 142 Q77 150 80 158"
          fill="none" stroke="rgba(26,58,106,0.22)" strokeWidth="1.2" strokeLinecap="round"
        />
        {/* Centre plume teardrop ornament */}
        <path d="M80 155 Q83 149 80 143 Q77 149 80 155Z" fill="#D4A833" opacity="0.85" />
        <ellipse cx="80" cy="151" rx="2.2" ry="1.4" fill="#1A3A6A" opacity="0.65" />
        <ellipse cx="80" cy="151" rx="1" ry="0.6" fill="#1B8A8A" opacity="0.5" />

        {/* Left plume -- sweeps left */}
        <path
          d="M75 116 Q64 130 54 142 Q48 150 42 156"
          fill="none" stroke="url(#ph-tail)" strokeWidth="4.5" strokeLinecap="round"
        />
        <path
          d="M75 116 Q64 130 54 142 Q48 150 42 156"
          fill="none" stroke="rgba(26,58,106,0.18)" strokeWidth="1" strokeLinecap="round"
        />
        {/* Left plume teardrop ornament */}
        <path d="M42 153 Q46 147 42 141 Q38 147 42 153Z" fill="#D4A833" opacity="0.8" />
        <ellipse cx="42" cy="149" rx="1.8" ry="1" fill="#C72D3C" opacity="0.55" />

        {/* Right plume -- sweeps right */}
        <path
          d="M85 116 Q96 130 106 142 Q112 150 118 156"
          fill="none" stroke="url(#ph-tail)" strokeWidth="4.5" strokeLinecap="round"
        />
        <path
          d="M85 116 Q96 130 106 142 Q112 150 118 156"
          fill="none" stroke="rgba(26,58,106,0.18)" strokeWidth="1" strokeLinecap="round"
        />
        {/* Right plume teardrop ornament */}
        <path d="M118 153 Q122 147 118 141 Q114 147 118 153Z" fill="#D4A833" opacity="0.8" />
        <ellipse cx="118" cy="149" rx="1.8" ry="1" fill="#C72D3C" opacity="0.55" />

        {/* Inline feather accents along plumes */}
        <path d="M72 128 Q74 124 72 120 Q70 124 72 128Z" fill="url(#ph-feather-gold)" opacity="0.6" />
        <path d="M88 128 Q90 124 88 120 Q86 124 88 128Z" fill="url(#ph-feather-gold)" opacity="0.6" />
        <path d="M63 136 Q65 132 63 128 Q61 132 63 136Z" fill="url(#ph-feather-turq)" opacity="0.5" />
        <path d="M97 136 Q99 132 97 128 Q95 132 97 136Z" fill="url(#ph-feather-turq)" opacity="0.5" />
        <path d="M56 142 Q58 139 56 136 Q54 139 56 142Z" fill="url(#ph-feather-lapis)" opacity="0.45" />
        <path d="M104 142 Q106 139 104 136 Q102 139 104 142Z" fill="url(#ph-feather-lapis)" opacity="0.45" />

        {/* Gold filigree spirals on tail feathers */}
        <path
          d="M68 124 Q66 121 70 120"
          fill="none" stroke="#D4A833" strokeWidth="0.5" strokeOpacity="0.4" strokeLinecap="round"
        />
        <path
          d="M92 124 Q94 121 90 120"
          fill="none" stroke="#D4A833" strokeWidth="0.5" strokeOpacity="0.4" strokeLinecap="round"
        />
      </g>

      {/* ================================================================ */}
      {/*  LEFT WING (behind body)                                          */}
      {/* ================================================================ */}
      <g className="tokki-wing--left">
        {/* Main wing shape */}
        <path
          d="M58 82 Q28 66 12 42 Q8 36 14 40 Q30 52 44 60 L56 78Z"
          fill="url(#ph-wing)" stroke="rgba(26,58,106,0.3)" strokeWidth="1"
        />
        {/* Upper wing extension */}
        <path
          d="M54 76 Q22 56 8 30 Q6 24 12 28 Q28 42 46 58Z"
          fill="url(#ph-wing-dark)" opacity="0.65" stroke="rgba(26,58,106,0.2)" strokeWidth="0.8"
        />
        {/* Layered teardrop feathers -- outer row */}
        <path d="M18 46 Q21 40 18 34 Q15 40 18 46Z" fill="url(#ph-feather-gold)" opacity="0.85" />
        <path d="M26 52 Q29 46 26 40 Q23 46 26 52Z" fill="url(#ph-feather-turq)" opacity="0.7" />
        <path d="M34 58 Q37 52 34 46 Q31 52 34 58Z" fill="url(#ph-feather-crimson)" opacity="0.65" />
        <path d="M42 64 Q45 58 42 52 Q39 58 42 64Z" fill="url(#ph-feather-gold)" opacity="0.7" />
        {/* Inner row -- smaller */}
        <path d="M22 50 Q24 46 22 42 Q20 46 22 50Z" fill="#D4A833" opacity="0.5" />
        <path d="M30 56 Q32 52 30 48 Q28 52 30 56Z" fill="#1B8A8A" opacity="0.45" />
        <path d="M38 62 Q40 58 38 54 Q36 58 38 62Z" fill="#D4A833" opacity="0.5" />
        {/* Gold scalloped edge */}
        <path
          d="M12 42 Q20 46 28 52 Q36 58 46 66"
          fill="none" stroke="#D4A833" strokeWidth="1" strokeOpacity="0.45" strokeLinecap="round"
        />
        {/* Turquoise accent line */}
        <path
          d="M16 40 Q24 44 32 50 Q40 56 48 62"
          fill="none" stroke="#1B8A8A" strokeWidth="0.6" strokeOpacity="0.35" strokeLinecap="round"
        />
        {/* Tiny lapis dots along wing edge */}
        <circle cx="16" cy="42" r="0.8" fill="#1A3A6A" opacity="0.5" />
        <circle cx="24" cy="48" r="0.8" fill="#1A3A6A" opacity="0.5" />
        <circle cx="32" cy="54" r="0.8" fill="#1A3A6A" opacity="0.5" />
      </g>

      {/* ================================================================ */}
      {/*  RIGHT WING (behind body)                                         */}
      {/* ================================================================ */}
      <g className="tokki-wing--right">
        {/* Main wing shape */}
        <path
          d="M102 82 Q132 66 148 42 Q152 36 146 40 Q130 52 116 60 L104 78Z"
          fill="url(#ph-wing)" stroke="rgba(26,58,106,0.3)" strokeWidth="1"
        />
        {/* Upper wing extension */}
        <path
          d="M106 76 Q138 56 152 30 Q154 24 148 28 Q132 42 114 58Z"
          fill="url(#ph-wing-dark)" opacity="0.65" stroke="rgba(26,58,106,0.2)" strokeWidth="0.8"
        />
        {/* Layered teardrop feathers -- outer row */}
        <path d="M142 46 Q145 40 142 34 Q139 40 142 46Z" fill="url(#ph-feather-gold)" opacity="0.85" />
        <path d="M134 52 Q137 46 134 40 Q131 46 134 52Z" fill="url(#ph-feather-turq)" opacity="0.7" />
        <path d="M126 58 Q129 52 126 46 Q123 52 126 58Z" fill="url(#ph-feather-crimson)" opacity="0.65" />
        <path d="M118 64 Q121 58 118 52 Q115 58 118 64Z" fill="url(#ph-feather-gold)" opacity="0.7" />
        {/* Inner row -- smaller */}
        <path d="M138 50 Q140 46 138 42 Q136 46 138 50Z" fill="#D4A833" opacity="0.5" />
        <path d="M130 56 Q132 52 130 48 Q128 52 130 56Z" fill="#1B8A8A" opacity="0.45" />
        <path d="M122 62 Q124 58 122 54 Q120 58 122 62Z" fill="#D4A833" opacity="0.5" />
        {/* Gold scalloped edge */}
        <path
          d="M148 42 Q140 46 132 52 Q124 58 114 66"
          fill="none" stroke="#D4A833" strokeWidth="1" strokeOpacity="0.45" strokeLinecap="round"
        />
        {/* Turquoise accent line */}
        <path
          d="M144 40 Q136 44 128 50 Q120 56 112 62"
          fill="none" stroke="#1B8A8A" strokeWidth="0.6" strokeOpacity="0.35" strokeLinecap="round"
        />
        {/* Tiny lapis dots along wing edge */}
        <circle cx="144" cy="42" r="0.8" fill="#1A3A6A" opacity="0.5" />
        <circle cx="136" cy="48" r="0.8" fill="#1A3A6A" opacity="0.5" />
        <circle cx="128" cy="54" r="0.8" fill="#1A3A6A" opacity="0.5" />
      </g>

      {/* ================================================================ */}
      {/*  BODY (compact upright oval -- proud phoenix posture)              */}
      {/* ================================================================ */}
      <ellipse
        className="tokki-body"
        cx="80" cy="102" rx="22" ry="20"
        fill="url(#ph-body)" stroke="rgba(26,58,106,0.24)" strokeWidth="1.5"
      />

      {/* Breast feather overlay -- ornamental teardrop pattern */}
      <ellipse cx="80" cy="100" rx="14" ry="13" fill="url(#ph-breast)" opacity="0.9" />
      {/* Teardrop breast feathers -- row 1 */}
      <path d="M74 95 Q76 91 74 87 Q72 91 74 95Z" fill="#D4A833" opacity="0.4" />
      <path d="M80 93 Q82 89 80 85 Q78 89 80 93Z" fill="#D4A833" opacity="0.45" />
      <path d="M86 95 Q88 91 86 87 Q84 91 86 95Z" fill="#D4A833" opacity="0.4" />
      {/* Row 2 -- smaller, staggered */}
      <path d="M77 101 Q79 97 77 93 Q75 97 77 101Z" fill="#FFF4C0" opacity="0.28" />
      <path d="M83 101 Q85 97 83 93 Q81 97 83 101Z" fill="#FFF4C0" opacity="0.28" />
      {/* Row 3 -- turquoise accent */}
      <path d="M80 107 Q82 103 80 99 Q78 103 80 107Z" fill="#1B8A8A" opacity="0.2" />

      {/* Ornamental dots on body perimeter -- Persian miniature motif */}
      <circle cx="72" cy="100" r="1" fill="#1A3A6A" opacity="0.3" />
      <circle cx="88" cy="100" r="1" fill="#1A3A6A" opacity="0.3" />
      <circle cx="80" cy="108" r="1.2" fill="#1A3A6A" opacity="0.25" />
      <circle cx="66" cy="105" r="0.7" fill="#D4A833" opacity="0.35" />
      <circle cx="94" cy="105" r="0.7" fill="#D4A833" opacity="0.35" />

      {/* Decorative scallop border at chest join */}
      <path
        d="M66 90 Q70 87 74 90 Q78 87 80 90 Q82 87 86 90 Q90 87 94 90"
        fill="none" stroke="#D4A833" strokeWidth="0.7" strokeOpacity="0.4" strokeLinecap="round"
      />

      {/* ================================================================ */}
      {/*  HEAD (slightly smaller than body, regal)                          */}
      {/* ================================================================ */}
      <ellipse
        className="tokki-head"
        cx="80" cy="62" rx="24" ry="22"
        fill="url(#ph-head)" stroke="rgba(26,58,106,0.26)" strokeWidth="1.5"
      />

      {/* Ornamental face filigree -- gold arabesques */}
      <path
        d="M66 56 Q72 49 80 47 Q88 49 94 56"
        fill="none" stroke="#D4A833" strokeWidth="0.9" strokeOpacity="0.55" strokeLinecap="round"
      />
      <path
        d="M70 52 Q76 46 80 45 Q84 46 90 52"
        fill="none" stroke="#D4A833" strokeWidth="0.6" strokeOpacity="0.38" strokeLinecap="round"
      />
      {/* Additional filigree swirl under crown */}
      <path
        d="M74 50 Q76 48 78 50"
        fill="none" stroke="#D4A833" strokeWidth="0.5" strokeOpacity="0.35" strokeLinecap="round"
      />
      <path
        d="M82 50 Q84 48 86 50"
        fill="none" stroke="#D4A833" strokeWidth="0.5" strokeOpacity="0.35" strokeLinecap="round"
      />
      {/* Tiny gold dots framing the face */}
      <circle cx="64" cy="58" r="0.9" fill="#D4A833" opacity="0.55" />
      <circle cx="96" cy="58" r="0.9" fill="#D4A833" opacity="0.55" />
      <circle cx="60" cy="64" r="0.7" fill="#D4A833" opacity="0.4" />
      <circle cx="100" cy="64" r="0.7" fill="#D4A833" opacity="0.4" />
      {/* Turquoise face accents */}
      <circle cx="62" cy="61" r="0.5" fill="#1B8A8A" opacity="0.4" />
      <circle cx="98" cy="61" r="0.5" fill="#1B8A8A" opacity="0.4" />

      {/* ================================================================ */}
      {/*  FLAME CREST / CROWN (tokki-ear class for animation compat)        */}
      {/* ================================================================ */}
      <g className="tokki-ear tokki-ear--left" filter="url(#ph-glow)">
        {/* Left crest flame */}
        <path
          d="M72 44 Q76 32 72 20 Q68 32 72 44Z"
          fill="url(#ph-crest)" opacity="0.88" stroke="rgba(212,168,51,0.25)" strokeWidth="0.5"
        />
        {/* Small outer-left accent flame */}
        <path
          d="M64 50 Q67 40 64 30 Q61 40 64 50Z"
          fill="url(#ph-crest)" opacity="0.6" stroke="rgba(212,168,51,0.18)" strokeWidth="0.4"
        />
      </g>
      <g className="tokki-ear tokki-ear--right" filter="url(#ph-glow)">
        {/* Right crest flame */}
        <path
          d="M88 44 Q92 32 88 20 Q84 32 88 44Z"
          fill="url(#ph-crest)" opacity="0.88" stroke="rgba(212,168,51,0.25)" strokeWidth="0.5"
        />
        {/* Small outer-right accent flame */}
        <path
          d="M96 50 Q99 40 96 30 Q93 40 96 50Z"
          fill="url(#ph-crest)" opacity="0.6" stroke="rgba(212,168,51,0.18)" strokeWidth="0.4"
        />
      </g>
      {/* Centre crest flame -- tallest, crown jewel */}
      <g filter="url(#ph-glow)">
        <path
          d="M80 40 Q85 26 80 12 Q75 26 80 40Z"
          fill="url(#ph-crest)" stroke="rgba(212,168,51,0.35)" strokeWidth="0.6"
        />
        {/* Gold dot at flame tip -- like a jewel */}
        <circle cx="80" cy="14" r="1.2" fill="#FFF8D0" opacity="0.8" />
      </g>
      {/* Tiny decorative sparks around crest */}
      <circle cx="76" cy="22" r="0.6" fill="#FFF4C0" opacity="0.5" />
      <circle cx="84" cy="24" r="0.5" fill="#FFF4C0" opacity="0.45" />
      <circle cx="68" cy="34" r="0.5" fill="#D4A833" opacity="0.4" />
      <circle cx="92" cy="34" r="0.5" fill="#D4A833" opacity="0.4" />

      {/* ================================================================ */}
      {/*  EYES -- amber-gold with warm glow                                */}
      {/* ================================================================ */}
      {/* Eye glow halos */}
      <ellipse cx="71" cy="62" rx="8" ry="7" fill="url(#ph-eye-glow)" />
      <ellipse cx="89" cy="62" rx="8" ry="7" fill="url(#ph-eye-glow)" />

      <g className="tokki-eye tokki-eye--left">
        {/* Iris -- warm amber gold */}
        <ellipse cx="71" cy="62" rx="5" ry="4.5" fill="#D4A833" />
        <ellipse cx="71" cy="62" rx="5" ry="4.5" fill="none" stroke="rgba(26,58,106,0.35)" strokeWidth="0.8" />
        {/* Iris inner ring -- crimson accent */}
        <ellipse cx="71" cy="62" rx="3.5" ry="3.2" fill="none" stroke="#C72D3C" strokeWidth="0.4" strokeOpacity="0.35" />
        {/* Pupil */}
        <ellipse cx="71" cy="62" rx="2" ry="4" fill="#181210" />
        {/* Highlights -- sparkle */}
        <ellipse cx="69.5" cy="60.5" rx="1.6" ry="1.5" fill="#FFF8D0" opacity="0.9" />
        <ellipse cx="72" cy="63.5" rx="0.8" ry="0.8" fill="#fff" opacity="0.5" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        {/* Iris */}
        <ellipse cx="89" cy="62" rx="5" ry="4.5" fill="#D4A833" />
        <ellipse cx="89" cy="62" rx="5" ry="4.5" fill="none" stroke="rgba(26,58,106,0.35)" strokeWidth="0.8" />
        {/* Iris inner ring */}
        <ellipse cx="89" cy="62" rx="3.5" ry="3.2" fill="none" stroke="#C72D3C" strokeWidth="0.4" strokeOpacity="0.35" />
        {/* Pupil */}
        <ellipse cx="89" cy="62" rx="2" ry="4" fill="#181210" />
        {/* Highlights */}
        <ellipse cx="87.5" cy="60.5" rx="1.6" ry="1.5" fill="#FFF8D0" opacity="0.9" />
        <ellipse cx="90" cy="63.5" rx="0.8" ry="0.8" fill="#fff" opacity="0.5" />
      </g>

      {/* Brow arcs */}
      <path d="M64 55 Q71 51 78 55" fill="none" stroke="rgba(26,58,106,0.22)" strokeWidth="1" strokeLinecap="round" />
      <path d="M82 55 Q89 51 96 55" fill="none" stroke="rgba(26,58,106,0.22)" strokeWidth="1" strokeLinecap="round" />

      {/* ================================================================ */}
      {/*  CHEEKS                                                           */}
      {/* ================================================================ */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="63" cy="70" rx="5" ry="3" fill="url(#ph-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="97" cy="70" rx="5" ry="3" fill="url(#ph-cheek)" />

      {/* ================================================================ */}
      {/*  BEAK (small, golden, diamond-shaped -- tokki-nose for beak)       */}
      {/* ================================================================ */}
      <polygon
        className="tokki-nose"
        points="80,67 76,72 80,78 84,72"
        fill="url(#ph-beak)" stroke="rgba(138,106,30,0.4)" strokeWidth="0.8" strokeLinejoin="round"
      />
      {/* Beak highlight */}
      <path d="M78 71 L80 68 L82 71" fill="#FFF4C0" opacity="0.35" />
      {/* Nostril marks */}
      <circle cx="79" cy="73" r="0.5" fill="#7A5A14" opacity="0.4" />
      <circle cx="81" cy="73" r="0.5" fill="#7A5A14" opacity="0.4" />

      {/* Tiny smile below beak */}
      <path className="tokki-mouth" d="M77 79 Q78 81 80 80 Q82 81 83 79" fill="none" stroke="#8A6A1E" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />

      {/* ================================================================ */}
      {/*  ZZZ / SNORE ELEMENTS                                             */}
      {/* ================================================================ */}
      <circle className="tokki-snore tokki-snore--a" cx="112" cy="54" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="119" cy="45" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="114" y="51" fontSize="10" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="122" y="39" fontSize="13" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="128" y="26" fontSize="16" fontWeight="bold" fill="#8b7e74">Z</text>

      {/* ================================================================ */}
      {/*  TALONS / FEET (tokki-paw for animation compat)                    */}
      {/* ================================================================ */}
      <g className="tokki-paw tokki-paw--left">
        <ellipse cx="70" cy="118" rx="8" ry="5" fill="url(#ph-talon)" stroke="rgba(138,106,30,0.3)" strokeWidth="1" />
        {/* Talon toes */}
        <path d="M64 120 L62 124" stroke="#7A5A14" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M68 121 L66 125" stroke="#7A5A14" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M72 121 L70 125" stroke="#7A5A14" strokeWidth="1.2" strokeLinecap="round" />
        {/* Gold claw tips */}
        <circle cx="62" cy="124.5" r="0.6" fill="#D4A833" opacity="0.6" />
        <circle cx="66" cy="125.5" r="0.6" fill="#D4A833" opacity="0.6" />
        <circle cx="70" cy="125.5" r="0.6" fill="#D4A833" opacity="0.6" />
      </g>
      <g className="tokki-paw tokki-paw--right">
        <ellipse cx="90" cy="118" rx="8" ry="5" fill="url(#ph-talon)" stroke="rgba(138,106,30,0.3)" strokeWidth="1" />
        {/* Talon toes */}
        <path d="M88 121 L90 125" stroke="#7A5A14" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M92 121 L94 125" stroke="#7A5A14" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M96 120 L98 124" stroke="#7A5A14" strokeWidth="1.2" strokeLinecap="round" />
        {/* Gold claw tips */}
        <circle cx="90" cy="125.5" r="0.6" fill="#D4A833" opacity="0.6" />
        <circle cx="94" cy="125.5" r="0.6" fill="#D4A833" opacity="0.6" />
        <circle cx="98" cy="124.5" r="0.6" fill="#D4A833" opacity="0.6" />
      </g>

      {/* ================================================================ */}
      {/*  ORNAMENTAL OVERLAY -- Persian miniature scattered accents          */}
      {/* ================================================================ */}
      {/* Body edge accent dots */}
      <circle cx="60" cy="96" r="0.9" fill="#D4A833" opacity="0.45" />
      <circle cx="100" cy="96" r="0.9" fill="#D4A833" opacity="0.45" />
      <circle cx="58" cy="104" r="0.6" fill="#1B8A8A" opacity="0.35" />
      <circle cx="102" cy="104" r="0.6" fill="#1B8A8A" opacity="0.35" />

      {/* Wing joint ornaments -- lapis gem with gold centre */}
      <circle cx="56" cy="82" r="1.8" fill="#1A3A6A" opacity="0.55" />
      <circle cx="56" cy="82" r="0.8" fill="#D4A833" opacity="0.7" />
      <circle cx="104" cy="82" r="1.8" fill="#1A3A6A" opacity="0.55" />
      <circle cx="104" cy="82" r="0.8" fill="#D4A833" opacity="0.7" />

      {/* Decorative cross motifs on wings -- Persian tile pattern */}
      <path
        d="M36 68 L38 66 L40 68 L38 70Z"
        fill="none" stroke="#D4A833" strokeWidth="0.5" strokeOpacity="0.35"
      />
      <path
        d="M120 68 L122 66 L124 68 L122 70Z"
        fill="none" stroke="#D4A833" strokeWidth="0.5" strokeOpacity="0.35"
      />

      {/* Tiny turquoise and gold dots scattered -- simulates illuminated manuscript */}
      <circle cx="48" cy="72" r="0.5" fill="#1B8A8A" opacity="0.3" />
      <circle cx="112" cy="72" r="0.5" fill="#1B8A8A" opacity="0.3" />
      <circle cx="44" cy="78" r="0.4" fill="#D4A833" opacity="0.3" />
      <circle cx="116" cy="78" r="0.4" fill="#D4A833" opacity="0.3" />
    </svg>
  );
}

registerAvatar({
  id: "phoenix_v1",
  label: "Phoenix",
  emoji: "\u{1F985}",
  cssClass: "tokki-asset--phoenix",
  Component: PhoenixV1Asset,
  fx: {
    playful: { particle: "ember", count: [5, 8], zone: { x: [20, 140], y: [10, 70] }, intensity: 0.7 },
    curious: { particle: "ember", count: [3, 6], zone: { x: [30, 130], y: [20, 80] }, intensity: 0.5 },
  },
});
