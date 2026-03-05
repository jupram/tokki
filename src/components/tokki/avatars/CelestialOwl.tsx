import { registerAvatar } from "./index";

function CelestialOwlV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--owl"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Body — deep midnight indigo with warm centre */}
        <radialGradient id="ow-body" cx="50%" cy="36%" r="58%">
          <stop offset="0%" stopColor="#2C3E7A" />
          <stop offset="55%" stopColor="#1B2656" />
          <stop offset="100%" stopColor="#0F1838" />
        </radialGradient>

        {/* Head — slightly lighter indigo to separate from body */}
        <radialGradient id="ow-head" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#34498A" />
          <stop offset="60%" stopColor="#1F3060" />
          <stop offset="100%" stopColor="#141E44" />
        </radialGradient>

        {/* Facial disc — pale moonlight wash for the owl face frame */}
        <radialGradient id="ow-disc" cx="50%" cy="48%" r="52%">
          <stop offset="0%" stopColor="#E8E0F0" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#C8B8D8" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#A090B0" stopOpacity="0" />
        </radialGradient>

        {/* Wing gradient — indigo to gold tips, Art Nouveau feather sweep */}
        <linearGradient id="ow-wing-r" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#1B2656" />
          <stop offset="50%" stopColor="#2C3E7A" />
          <stop offset="85%" stopColor="#C9A030" />
          <stop offset="100%" stopColor="#E8C848" />
        </linearGradient>
        <linearGradient id="ow-wing-l" x1="1" y1="0" x2="0" y2="0.5">
          <stop offset="0%" stopColor="#1B2656" />
          <stop offset="50%" stopColor="#2C3E7A" />
          <stop offset="85%" stopColor="#C9A030" />
          <stop offset="100%" stopColor="#E8C848" />
        </linearGradient>

        {/* Eye iris — deep violet with luminous amber ring */}
        <radialGradient id="ow-iris" cx="45%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#E8C848" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#D4A020" />
          <stop offset="70%" stopColor="#B07818" />
          <stop offset="100%" stopColor="#6A480E" />
        </radialGradient>

        {/* Gold accent ring around eyes */}
        <radialGradient id="ow-eye-ring" cx="50%" cy="50%" r="52%">
          <stop offset="0%" stopColor="#D4A833" stopOpacity="0" />
          <stop offset="65%" stopColor="#D4A833" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#E8C848" stopOpacity="0.8" />
        </radialGradient>

        {/* Lunar glow behind eyes — soft halo */}
        <radialGradient id="ow-lunar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8E0F0" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#E8E0F0" stopOpacity="0" />
        </radialGradient>

        {/* Belly feather overlay — slightly lighter indigo with gold hint */}
        <radialGradient id="ow-belly" cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#34498A" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1B2656" stopOpacity="0.2" />
        </radialGradient>

        {/* Beak / nose — warm gold */}
        <linearGradient id="ow-beak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8C848" />
          <stop offset="100%" stopColor="#C9A030" />
        </linearGradient>

        {/* Talon — darker gold-brown */}
        <linearGradient id="ow-talon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A030" />
          <stop offset="100%" stopColor="#8A6C1E" />
        </linearGradient>

        {/* Cheek blush — soft warm pink on indigo */}
        <radialGradient id="ow-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D0A0C0" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#C088A8" stopOpacity="0.1" />
        </radialGradient>

        {/* Ear tuft gradient — indigo to gold tip */}
        <linearGradient id="ow-tuft-l" x1="0.6" y1="1" x2="0.3" y2="0">
          <stop offset="0%" stopColor="#1B2656" />
          <stop offset="70%" stopColor="#2C3E7A" />
          <stop offset="100%" stopColor="#D4A833" />
        </linearGradient>
        <linearGradient id="ow-tuft-r" x1="0.4" y1="1" x2="0.7" y2="0">
          <stop offset="0%" stopColor="#1B2656" />
          <stop offset="70%" stopColor="#2C3E7A" />
          <stop offset="100%" stopColor="#D4A833" />
        </linearGradient>

        {/* Crescent moon glow */}
        <radialGradient id="ow-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFBE8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#E8D888" stopOpacity="0" />
        </radialGradient>

        {/* Star sparkle glow */}
        <radialGradient id="ow-star-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFEF0" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#E8E0D0" stopOpacity="0" />
        </radialGradient>

        {/* Gold Art Nouveau border stroke */}
        <linearGradient id="ow-gold-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8C848" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#D4A833" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#C9A030" stopOpacity="0.6" />
        </linearGradient>

        {/* Soft shadow filter for body depth */}
        <filter id="ow-soft-shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dy="2" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feFlood floodColor="#080E20" floodOpacity="0.15" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Eye glow filter */}
        <filter id="ow-eye-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>

        {/* Constellation line softener */}
        <filter id="ow-line-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>

      {/* ======== Decorative celestial elements ======== */}

      {/* Crescent moon — top-left, Art Nouveau curved form */}
      <g opacity="0.55">
        <circle cx="26" cy="28" r="7" fill="url(#ow-moon-glow)" />
        <path
          d="M22 22 A8 8 0 1 1 22 34 A6 6 0 1 0 22 22"
          fill="#FFFBE8"
          opacity="0.7"
        />
      </g>

      {/* Star — top centre, 5-pointed Art Nouveau form */}
      <g opacity="0.6">
        <circle cx="80" cy="8" r="4" fill="url(#ow-star-glow)" />
        <polygon
          points="80,3 81.4,6.5 85,7 82.2,9.5 83,13 80,11 77,13 77.8,9.5 75,7 78.6,6.5"
          fill="#FFFEF0"
          opacity="0.7"
        />
      </g>

      {/* Star — top right */}
      <g opacity="0.45">
        <circle cx="136" cy="24" r="3" fill="url(#ow-star-glow)" />
        <polygon
          points="136,20.5 137,23 139.5,23.5 137.5,25 138,27.5 136,26 134,27.5 134.5,25 132.5,23.5 135,23"
          fill="#FFFEF0"
          opacity="0.65"
        />
      </g>

      {/* Tiny scattered stars */}
      <circle cx="18" cy="58" r="1.2" fill="#E8D888" opacity="0.4" />
      <circle cx="146" cy="50" r="1" fill="#E8D888" opacity="0.35" />
      <circle cx="40" cy="10" r="0.8" fill="#FFFEF0" opacity="0.45" />
      <circle cx="122" cy="6" r="0.9" fill="#FFFEF0" opacity="0.4" />
      <circle cx="10" cy="42" r="0.7" fill="#D4A833" opacity="0.3" />
      <circle cx="150" cy="38" r="0.7" fill="#D4A833" opacity="0.3" />

      {/* Faint constellation connecting lines — decorative arc */}
      <path
        d="M26 28 Q40 14 80 8 Q120 14 136 24"
        fill="none"
        stroke="#E8D888"
        strokeWidth="0.4"
        strokeDasharray="2 4"
        opacity="0.2"
        filter="url(#ow-line-blur)"
      />

      {/* ======== Ground shadow ======== */}
      <ellipse className="tokki-shadow" cx="80" cy="144" rx="38" ry="7" />

      {/* ======== Tail — small feathered tail tuft behind body ======== */}
      <path
        className="tokki-tail"
        d="M106 120 Q120 112 124 100 Q126 92 122 86"
        fill="none"
        stroke="#1B2656"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M106 120 Q120 112 124 100 Q126 92 122 86"
        fill="none"
        stroke="url(#ow-gold-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Gold feather tip on tail */}
      <circle cx="122" cy="86" r="3.5" fill="#D4A833" opacity="0.3" />

      {/* ======== Body — round and compact ======== */}
      <ellipse
        className="tokki-body"
        cx="80"
        cy="112"
        rx="33"
        ry="27"
        fill="url(#ow-body)"
        stroke="rgba(20,30,68,0.35)"
        strokeWidth="1.5"
        filter="url(#ow-soft-shadow)"
      />

      {/* Art Nouveau belly feather scallops — flowing organic curves with gold */}
      <path
        d="M58 104 Q65 98 72 104 Q80 98 88 104 Q95 98 102 104"
        fill="none"
        stroke="rgba(212,168,51,0.2)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M54 112 Q62 106 70 112 Q80 106 90 112 Q98 106 106 112"
        fill="none"
        stroke="rgba(212,168,51,0.16)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M52 120 Q60 114 68 120 Q80 114 92 120 Q100 114 108 120"
        fill="none"
        stroke="rgba(212,168,51,0.12)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Central belly ornament — Art Nouveau diamond motif */}
      <path
        d="M80 106 L83 110 L80 114 L77 110 Z"
        fill="none"
        stroke="rgba(212,168,51,0.22)"
        strokeWidth="0.8"
      />
      <circle cx="80" cy="110" r="1" fill="#D4A833" opacity="0.2" />

      {/* Belly overlay — faint lighter indigo wash */}
      <ellipse cx="80" cy="114" rx="18" ry="20" fill="url(#ow-belly)" />

      {/* ======== Left wing — 4 layered Art Nouveau feather curves ======== */}
      <g className="tokki-paw tokki-paw--left">
        <path
          d="M47 102 Q28 94 22 110 Q20 122 28 130 Q36 134 47 126"
          fill="url(#ow-wing-l)"
          stroke="rgba(20,30,68,0.25)"
          strokeWidth="1.2"
          opacity="0.45"
        />
        <path
          d="M49 98 Q32 88 24 104 Q22 116 32 124 Q40 128 49 120"
          fill="url(#ow-wing-l)"
          stroke="rgba(20,30,68,0.25)"
          strokeWidth="1.2"
          opacity="0.6"
        />
        <path
          d="M51 94 Q36 82 26 98 Q24 110 34 118 Q42 122 51 114"
          fill="url(#ow-wing-l)"
          stroke="rgba(20,30,68,0.25)"
          strokeWidth="1.2"
          opacity="0.75"
        />
        <path
          d="M53 90 Q40 78 30 92 Q28 104 38 112 Q44 116 53 108"
          fill="url(#ow-wing-l)"
          stroke="rgba(212,168,51,0.25)"
          strokeWidth="1"
          opacity="0.9"
        />
        {/* Gold feather edge accents */}
        <path
          d="M26 114 Q24 120 28 126"
          fill="none"
          stroke="#D4A833"
          strokeWidth="0.7"
          opacity="0.35"
          strokeLinecap="round"
        />
      </g>

      {/* ======== Right wing — 4 layered Art Nouveau feather curves ======== */}
      <g className="tokki-paw tokki-paw--right">
        <path
          d="M113 102 Q132 94 138 110 Q140 122 132 130 Q124 134 113 126"
          fill="url(#ow-wing-r)"
          stroke="rgba(20,30,68,0.25)"
          strokeWidth="1.2"
          opacity="0.45"
        />
        <path
          d="M111 98 Q128 88 136 104 Q138 116 128 124 Q120 128 111 120"
          fill="url(#ow-wing-r)"
          stroke="rgba(20,30,68,0.25)"
          strokeWidth="1.2"
          opacity="0.6"
        />
        <path
          d="M109 94 Q124 82 134 98 Q136 110 126 118 Q118 122 109 114"
          fill="url(#ow-wing-r)"
          stroke="rgba(20,30,68,0.25)"
          strokeWidth="1.2"
          opacity="0.75"
        />
        <path
          d="M107 90 Q120 78 130 92 Q132 104 122 112 Q116 116 107 108"
          fill="url(#ow-wing-r)"
          stroke="rgba(212,168,51,0.25)"
          strokeWidth="1"
          opacity="0.9"
        />
        {/* Gold feather edge accents */}
        <path
          d="M134 114 Q136 120 132 126"
          fill="none"
          stroke="#D4A833"
          strokeWidth="0.7"
          opacity="0.35"
          strokeLinecap="round"
        />
      </g>

      {/* ======== Head — large round owl head ======== */}
      <circle
        className="tokki-head"
        cx="80"
        cy="70"
        r="37"
        fill="url(#ow-head)"
        stroke="rgba(20,30,68,0.3)"
        strokeWidth="1.8"
      />

      {/* Art Nouveau gold border arc on head — subtle crown-like curve */}
      <path
        d="M48 56 Q56 42 80 38 Q104 42 112 56"
        fill="none"
        stroke="url(#ow-gold-stroke)"
        strokeWidth="0.9"
        strokeLinecap="round"
      />

      {/* Head highlight — moonlight sheen */}
      <ellipse cx="70" cy="52" rx="14" ry="9" fill="#C8D0E8" opacity="0.08" />

      {/* ======== Facial disc — Art Nouveau heart-shaped frame ======== */}
      <path
        d="M48 64 Q52 48 80 44 Q108 48 112 64 Q112 80 98 86 Q90 90 80 88 Q70 90 62 86 Q48 80 48 64 Z"
        fill="url(#ow-disc)"
        stroke="rgba(212,168,51,0.18)"
        strokeWidth="0.8"
      />
      {/* Inner disc border — faint Art Nouveau double-line */}
      <path
        d="M52 64 Q56 52 80 48 Q104 52 108 64 Q108 78 96 83 Q88 86 80 85 Q72 86 64 83 Q52 78 52 64 Z"
        fill="none"
        stroke="rgba(212,168,51,0.1)"
        strokeWidth="0.5"
      />

      {/* ======== Ear tufts — left ======== */}
      <g className="tokki-ear tokki-ear--left">
        {/* Main tuft — thick feathered stroke */}
        <path
          d="M52 42 Q46 24 40 14"
          fill="none"
          stroke="url(#ow-tuft-l)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Secondary tuft feather */}
        <path
          d="M56 44 Q52 30 48 20"
          fill="none"
          stroke="#2C3E7A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Thin gold accent line */}
        <path
          d="M52 42 Q46 24 40 14"
          fill="none"
          stroke="rgba(212,168,51,0.4)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        {/* Tiny star at tuft tip */}
        <circle cx="40" cy="14" r="1.5" fill="#E8C848" opacity="0.5" />
      </g>

      {/* ======== Ear tufts — right ======== */}
      <g className="tokki-ear tokki-ear--right">
        <path
          d="M108 42 Q114 24 120 14"
          fill="none"
          stroke="url(#ow-tuft-r)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M104 44 Q108 30 112 20"
          fill="none"
          stroke="#2C3E7A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M108 42 Q114 24 120 14"
          fill="none"
          stroke="rgba(212,168,51,0.4)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle cx="120" cy="14" r="1.5" fill="#E8C848" opacity="0.5" />
      </g>

      {/* ======== Eye glow auras ======== */}
      <circle cx="64" cy="66" r="17" fill="url(#ow-lunar-glow)" filter="url(#ow-eye-glow)" />
      <circle cx="96" cy="66" r="17" fill="url(#ow-lunar-glow)" filter="url(#ow-eye-glow)" />

      {/* ======== Left eye — large, hypnotic, dominant feature ======== */}
      <g className="tokki-eye tokki-eye--left">
        {/* Outer eye ring */}
        <circle cx="64" cy="66" r="14" fill="#0A0E1E" stroke="rgba(212,168,51,0.3)" strokeWidth="1.2" />
        {/* Amber iris with depth */}
        <circle cx="64" cy="66" r="12" fill="url(#ow-iris)" />
        {/* Gold ring shimmer */}
        <circle cx="64" cy="66" r="12" fill="url(#ow-eye-ring)" />
        {/* Radial iris lines — stained glass effect */}
        <path d="M64 54 L64 57" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <path d="M56 60 L58.5 61.5" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <path d="M72 60 L69.5 61.5" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <path d="M56 72 L58.5 70.5" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <path d="M72 72 L69.5 70.5" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <path d="M64 78 L64 75" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        {/* Dark pupil */}
        <circle cx="64" cy="66" r="5" fill="#08061A" />
        {/* Primary specular highlight */}
        <circle cx="61" cy="63" r="3" fill="#FFFEF0" opacity="0.88" />
        {/* Secondary highlight */}
        <circle cx="67" cy="69" r="1.4" fill="#FFFEF0" opacity="0.5" />
        {/* Tiny crescent moon reflection in eye */}
        <path
          d="M59 61 A1.5 1.5 0 1 1 59 64 A1.2 1.2 0 1 0 59 61"
          fill="#FFFEF0"
          opacity="0.2"
        />
      </g>

      {/* ======== Right eye — large, hypnotic, dominant feature ======== */}
      <g className="tokki-eye tokki-eye--right">
        <circle cx="96" cy="66" r="14" fill="#0A0E1E" stroke="rgba(212,168,51,0.3)" strokeWidth="1.2" />
        <circle cx="96" cy="66" r="12" fill="url(#ow-iris)" />
        <circle cx="96" cy="66" r="12" fill="url(#ow-eye-ring)" />
        {/* Radial iris lines — stained glass effect */}
        <path d="M96 54 L96 57" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <path d="M88 60 L90.5 61.5" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <path d="M104 60 L101.5 61.5" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <path d="M88 72 L90.5 70.5" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <path d="M104 72 L101.5 70.5" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <path d="M96 78 L96 75" stroke="#6A480E" strokeWidth="0.4" opacity="0.3" />
        <circle cx="96" cy="66" r="5" fill="#08061A" />
        <circle cx="93" cy="63" r="3" fill="#FFFEF0" opacity="0.88" />
        <circle cx="99" cy="69" r="1.4" fill="#FFFEF0" opacity="0.5" />
        <path
          d="M91 61 A1.5 1.5 0 1 1 91 64 A1.2 1.2 0 1 0 91 61"
          fill="#FFFEF0"
          opacity="0.2"
        />
      </g>

      {/* ======== Cheeks — soft pink-lavender blush ======== */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="50" cy="76" rx="5.5" ry="3" fill="url(#ow-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="110" cy="76" rx="5.5" ry="3" fill="url(#ow-cheek)" />

      {/* ======== Beak / nose — small golden triangle ======== */}
      <polygon
        className="tokki-nose"
        points="80,78 76,74 84,74"
        fill="url(#ow-beak)"
        stroke="rgba(138,108,30,0.4)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Beak highlight */}
      <path d="M78 74.5 L80 77 L82 74.5" fill="#FFFBE8" opacity="0.35" />

      {/* ======== Mouth — subtle gentle curve below beak ======== */}
      <path
        className="tokki-mouth"
        d="M76 80 Q78 82 80 82 Q82 82 84 80"
        fill="none"
        stroke="rgba(212,168,51,0.28)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* ======== Art Nouveau decorative flourishes on body ======== */}
      {/* Flowing gold vine curves wrapping the body — signature Art Nouveau motif */}
      <path
        d="M54 100 Q48 108 50 118 Q52 124 56 126"
        fill="none"
        stroke="rgba(212,168,51,0.15)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M106 100 Q112 108 110 118 Q108 124 104 126"
        fill="none"
        stroke="rgba(212,168,51,0.15)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      {/* Small gold leaf forms */}
      <ellipse cx="50" cy="118" rx="2" ry="1" fill="#D4A833" opacity="0.12" transform="rotate(-20 50 118)" />
      <ellipse cx="110" cy="118" rx="2" ry="1" fill="#D4A833" opacity="0.12" transform="rotate(20 110 118)" />

      {/* Small crescent motif on chest — celestial badge */}
      <path
        d="M78 98 A3 3 0 1 1 78 104 A2.2 2.2 0 1 0 78 98"
        fill="#D4A833"
        opacity="0.18"
      />

      {/* ======== Talons — small, visible below body ======== */}
      <g className="tokki-paw" opacity="0.85">
        {/* Left foot — three small talon toes */}
        <path d="M66 136 L64 141 L66 140 L68 141 L66 136" fill="url(#ow-talon)" />
        <path d="M72 137 L70 142 L72 141 L74 142 L72 137" fill="url(#ow-talon)" />
        <path d="M60 135 L58 140 L60 139 L62 140 L60 135" fill="url(#ow-talon)" />
        {/* Right foot — three small talon toes */}
        <path d="M94 136 L92 141 L94 140 L96 141 L94 136" fill="url(#ow-talon)" />
        <path d="M88 137 L86 142 L88 141 L90 142 L88 137" fill="url(#ow-talon)" />
        <path d="M100 135 L98 140 L100 139 L102 140 L100 135" fill="url(#ow-talon)" />
      </g>

      {/* ======== Zzz / Snore elements ======== */}
      <circle className="tokki-snore tokki-snore--a" cx="118" cy="58" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="125" cy="48" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="120" y="55" fontSize="10" fontWeight="bold" fill="#8B8AAE">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="127" y="42" fontSize="13" fontWeight="bold" fill="#8B8AAE">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="134" y="30" fontSize="16" fontWeight="bold" fill="#8B8AAE">Z</text>
    </svg>
  );
}

registerAvatar({
  id: "owl_v1",
  label: "Celestial Owl",
  emoji: "\u{1F989}",
  cssClass: "tokki-asset--owl",
  Component: CelestialOwlV1Asset,
  fx: {
    curious: { particle: "star", count: [4, 7], zone: { x: [20, 140], y: [0, 60] }, intensity: 0.7 },
    idle: { particle: "star", count: [2, 4], zone: { x: [30, 130], y: [10, 50] }, intensity: 0.3 },
  },
});
