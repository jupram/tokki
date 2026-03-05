import { registerAvatar } from "./index";

function FoxV2Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--fox-v2"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* ── Ink-wash filters ── */}
        <filter id="f2-mist" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" />
        </filter>
        <filter id="f2-mist-light" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
        </filter>
        <filter id="f2-brush-edge" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="8" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="f2-ink-bleed" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="12" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="0.6" />
        </filter>

        {/* ── Ink-wash body gradients ── */}
        <linearGradient id="f2-body" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#9E8B72" />
          <stop offset="35%" stopColor="#8B7355" />
          <stop offset="65%" stopColor="#A0522D" />
          <stop offset="100%" stopColor="#7A5C40" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="f2-body-wash" x1="0" y1="0" x2="1" y2="0.7">
          <stop offset="0%" stopColor="#8B7355" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#A0522D" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#6B5340" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="f2-belly" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#F5F0E8" />
          <stop offset="60%" stopColor="#EDE5D8" />
          <stop offset="100%" stopColor="#D8CEBC" stopOpacity="0.6" />
        </radialGradient>

        {/* ── Head and face gradients ── */}
        <linearGradient id="f2-head" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#9E8B72" />
          <stop offset="40%" stopColor="#8B7355" />
          <stop offset="100%" stopColor="#7A6548" />
        </linearGradient>
        <radialGradient id="f2-face-mask" cx="50%" cy="55%" r="48%">
          <stop offset="0%" stopColor="#F5F0E8" />
          <stop offset="60%" stopColor="#EDE5D8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#D8CEBC" stopOpacity="0" />
        </radialGradient>

        {/* ── Ear gradients ── */}
        <linearGradient id="f2-ear-outer" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#8B7355" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#6B5340" />
        </linearGradient>
        <linearGradient id="f2-ear-inner" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#3A2A1C" />
          <stop offset="60%" stopColor="#2A1C10" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1A1008" stopOpacity="0.7" />
        </linearGradient>

        {/* ── Eye gradient (ink-drop iris) ── */}
        <radialGradient id="f2-iris" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#A08050" />
          <stop offset="50%" stopColor="#7A6038" />
          <stop offset="100%" stopColor="#4A3820" />
        </radialGradient>

        {/* ── Cheek wash ── */}
        <radialGradient id="f2-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C8A090" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#B08878" stopOpacity="0.1" />
        </radialGradient>

        {/* ── Paw gradient ── */}
        <linearGradient id="f2-paw" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#3A2A1C" />
          <stop offset="100%" stopColor="#2A1C12" stopOpacity="0.9" />
        </linearGradient>

        {/* ── Tail ink-trail gradient ── */}
        <linearGradient id="f2-tail" x1="0" y1="0.5" x2="1" y2="0">
          <stop offset="0%" stopColor="#8B7355" />
          <stop offset="40%" stopColor="#A0522D" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#7A5C40" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#F5F0E8" stopOpacity="0.3" />
        </linearGradient>

        {/* ── Tail tip diffusion ── */}
        <radialGradient id="f2-tail-tip" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#F5F0E8" />
          <stop offset="60%" stopColor="#EDE5D8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#D8CEBC" stopOpacity="0.2" />
        </radialGradient>

        {/* ── Brush-stroke marking gradient (calligraphic face marks) ── */}
        <linearGradient id="f2-brush-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3A2A1C" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#5A4432" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3A2A1C" stopOpacity="0.05" />
        </linearGradient>

        {/* ── Shadow wash ── */}
        <radialGradient id="f2-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5A4A38" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#5A4A38" stopOpacity="0.05" />
        </radialGradient>

        {/* ── Ink splotch overlay for parchment feel ── */}
        <filter id="f2-paper-texture" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="3" result="paper" />
          <feColorMatrix
            in="paper"
            type="saturate"
            values="0"
            result="greyPaper"
          />
          <feBlend in="SourceGraphic" in2="greyPaper" mode="multiply" />
        </filter>
      </defs>

      {/* ── Ground shadow — ink pool ── */}
      <ellipse
        className="tokki-shadow"
        cx="80" cy="140" rx="40" ry="8"
        fill="url(#f2-shadow)"
        filter="url(#f2-mist-light)"
      />

      {/* ── Tail — flowing ink trail ── */}
      <g className="tokki-tail" filter="url(#f2-ink-bleed)">
        <path
          d="M108 112 Q136 96 134 68 Q132 48 140 36 Q144 28 148 22"
          fill="none"
          stroke="url(#f2-tail)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M108 112 Q136 96 134 68 Q132 48 140 36 Q144 28 148 22"
          fill="none"
          stroke="rgba(58,42,28,0.1)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      {/* Tail tip — misty ink diffusion */}
      <circle
        className="tokki-tail-tip"
        cx="148" cy="22" r="7.5"
        fill="url(#f2-tail-tip)"
        filter="url(#f2-mist)"
      />
      <circle cx="148" cy="22" r="3.5" fill="#F5F0E8" opacity="0.5" filter="url(#f2-mist-light)" />

      {/* ── Body — ink-wash torso ── */}
      <ellipse
        className="tokki-body"
        cx="80" cy="108" rx="26" ry="21"
        fill="url(#f2-body)"
        stroke="rgba(58,42,28,0.15)"
        strokeWidth="1.2"
        filter="url(#f2-brush-edge)"
      />
      {/* Belly — parchment wash */}
      <ellipse
        cx="80" cy="112" rx="15" ry="13"
        fill="url(#f2-belly)"
        opacity="0.8"
      />

      {/* ── Ears — pointed, with misty tips ── */}
      <g className="tokki-ear tokki-ear--left">
        <polygon
          className="tokki-ear-shell"
          points="50,52 26,6 72,38"
          fill="url(#f2-ear-outer)"
          stroke="rgba(58,42,28,0.18)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          filter="url(#f2-brush-edge)"
        />
        <polygon
          className="tokki-ear-inner"
          points="50,46 34,16 64,38"
          fill="url(#f2-ear-inner)"
        />
        {/* Misty ear tip */}
        <circle cx="34" cy="14" r="5" fill="#8B7355" opacity="0.25" filter="url(#f2-mist)" />
      </g>
      <g className="tokki-ear tokki-ear--right">
        <polygon
          className="tokki-ear-shell"
          points="110,52 134,6 88,38"
          fill="url(#f2-ear-outer)"
          stroke="rgba(58,42,28,0.18)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          filter="url(#f2-brush-edge)"
        />
        <polygon
          className="tokki-ear-inner"
          points="110,46 126,16 96,38"
          fill="url(#f2-ear-inner)"
        />
        {/* Misty ear tip */}
        <circle cx="126" cy="14" r="5" fill="#8B7355" opacity="0.25" filter="url(#f2-mist)" />
      </g>

      {/* ── Head — ink-wash sphere ── */}
      <ellipse
        className="tokki-head"
        cx="80" cy="74" rx="36" ry="34"
        fill="url(#f2-head)"
        stroke="rgba(58,42,28,0.16)"
        strokeWidth="1.4"
        filter="url(#f2-brush-edge)"
      />

      {/* ── Face mask — parchment white ── */}
      <path
        className="tokki-face-mask"
        d="M58 64 Q60 55 80 50 Q100 55 102 64 L102 78 Q100 96 80 98 Q60 96 58 78 Z"
        fill="url(#f2-face-mask)"
        opacity="0.92"
      />

      {/* ── Calligraphic brush-stroke markings on face ── */}
      {/* Brow strokes — like single brush pulls */}
      <path
        d="M58 62 Q65 57 73 62"
        fill="none"
        stroke="url(#f2-brush-mark)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M87 62 Q95 57 102 62"
        fill="none"
        stroke="url(#f2-brush-mark)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Cheek accent strokes — ink drips along muzzle */}
      <path
        d="M56 70 Q52 78 54 86"
        fill="none"
        stroke="rgba(58,42,28,0.12)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M104 70 Q108 78 106 86"
        fill="none"
        stroke="rgba(58,42,28,0.12)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Forehead seal mark — a faint circular brush stamp */}
      <circle
        cx="80" cy="56"
        r="4"
        fill="none"
        stroke="rgba(160,82,45,0.15)"
        strokeWidth="1"
        filter="url(#f2-ink-bleed)"
      />

      {/* ── Eyes — ink-drop iris, scholarly calm ── */}
      <g className="tokki-eye tokki-eye--left">
        <ellipse cx="66" cy="70" rx="5.5" ry="5" fill="url(#f2-iris)" />
        <ellipse cx="66" cy="70" rx="5.5" ry="5" fill="none" stroke="rgba(42,28,16,0.25)" strokeWidth="0.8" />
        <ellipse cx="66" cy="70" rx="2" ry="4.5" fill="#1A1008" />
        <ellipse cx="64.8" cy="68.5" rx="1.5" ry="1.5" fill="#F5F0E8" opacity="0.75" />
        <ellipse cx="67" cy="71.5" rx="0.7" ry="0.7" fill="#F5F0E8" opacity="0.35" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="94" cy="70" rx="5.5" ry="5" fill="url(#f2-iris)" />
        <ellipse cx="94" cy="70" rx="5.5" ry="5" fill="none" stroke="rgba(42,28,16,0.25)" strokeWidth="0.8" />
        <ellipse cx="94" cy="70" rx="2" ry="4.5" fill="#1A1008" />
        <ellipse cx="92.8" cy="68.5" rx="1.5" ry="1.5" fill="#F5F0E8" opacity="0.75" />
        <ellipse cx="95" cy="71.5" rx="0.7" ry="0.7" fill="#F5F0E8" opacity="0.35" />
      </g>

      {/* ── Cheeks — soft ink wash blush ── */}
      <ellipse
        className="tokki-cheek tokki-cheek--left"
        cx="55" cy="80" rx="6" ry="3.5"
        fill="url(#f2-cheek)"
        filter="url(#f2-mist-light)"
      />
      <ellipse
        className="tokki-cheek tokki-cheek--right"
        cx="105" cy="80" rx="6" ry="3.5"
        fill="url(#f2-cheek)"
        filter="url(#f2-mist-light)"
      />

      {/* ── Nose — ink dot ── */}
      <ellipse
        className="tokki-nose"
        cx="80" cy="80" rx="3.5" ry="2.8"
        fill="#2A1C10"
      />
      <ellipse cx="79.2" cy="79.2" rx="1" ry="0.7" fill="#4A3828" opacity="0.5" />

      {/* ── Mouth — calligraphic curve ── */}
      <path
        className="tokki-mouth"
        d="M75 85 Q78 89 80 88 Q82 89 85 85"
        fill="none"
        stroke="#3A2A1C"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* ── Zzz / snore elements ── */}
      <circle className="tokki-snore tokki-snore--a" cx="118" cy="64" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="125" cy="55" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="120" y="61" fontSize="10" fontWeight="bold" fill="#8B7355" opacity="0.7">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="127" y="49" fontSize="13" fontWeight="bold" fill="#8B7355" opacity="0.6">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="134" y="36" fontSize="16" fontWeight="bold" fill="#8B7355" opacity="0.5">Z</text>

      {/* ── Paws — ink-dipped forelegs ── */}
      <ellipse
        className="tokki-paw tokki-paw--left"
        cx="64" cy="108" rx="10" ry="7.5"
        fill="url(#f2-paw)"
        stroke="rgba(58,42,28,0.15)"
        strokeWidth="1"
        filter="url(#f2-brush-edge)"
      />
      <ellipse
        className="tokki-paw tokki-paw--right"
        cx="96" cy="108" rx="10" ry="7.5"
        fill="url(#f2-paw)"
        stroke="rgba(58,42,28,0.15)"
        strokeWidth="1"
        filter="url(#f2-brush-edge)"
      />

      {/* ── Hind paws ── */}
      <ellipse
        cx="68" cy="128" rx="10" ry="5.5"
        fill="url(#f2-paw)"
        stroke="rgba(58,42,28,0.12)"
        strokeWidth="1"
        filter="url(#f2-brush-edge)"
      />
      <ellipse
        cx="92" cy="128" rx="10" ry="5.5"
        fill="url(#f2-paw)"
        stroke="rgba(58,42,28,0.12)"
        strokeWidth="1"
        filter="url(#f2-brush-edge)"
      />

      {/* ── Atmospheric ink mist — ambient wisps floating around ── */}
      <circle cx="30" cy="100" r="8" fill="#8B7355" opacity="0.06" filter="url(#f2-mist)" />
      <circle cx="140" cy="90" r="6" fill="#A0522D" opacity="0.05" filter="url(#f2-mist)" />
      <circle cx="20" cy="60" r="5" fill="#8B7355" opacity="0.04" filter="url(#f2-mist)" />
      <circle cx="150" cy="50" r="4" fill="#A0522D" opacity="0.04" filter="url(#f2-mist)" />
    </svg>
  );
}

registerAvatar({
  id: "fox_v2",
  label: "Fox \u58A8",
  emoji: "\u{1F98A}",
  cssClass: "tokki-asset--fox-v2",
  Component: FoxV2Asset,
  fx: {
    curious: { particle: "ink", count: [2, 4], zone: { x: [90, 150], y: [60, 130] }, intensity: 0.6 },
    playful: { particle: "ink", count: [3, 5], zone: { x: [80, 150], y: [50, 140] }, intensity: 0.8 },
  },
});
