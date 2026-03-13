import { registerAvatar } from "./registry";

function PenguinV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--penguin"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Body gradient — deep navy */}
        <radialGradient id="pg-body" cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#9AA4AF" />
          <stop offset="100%" stopColor="#707A86" />
        </radialGradient>
        <radialGradient id="pg-head" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#B5BEC8" />
          <stop offset="100%" stopColor="#8B95A0" />
        </radialGradient>
        {/* Belly — clean white with ice tint */}
        <radialGradient id="pg-belly" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#E7ECF1" />
          <stop offset="80%" stopColor="#D5DCE4" />
          <stop offset="100%" stopColor="#C4CDD7" />
        </radialGradient>
        {/* Cheek blush */}
        <radialGradient id="pg-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F2B0B0" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#E89090" stopOpacity="0.2" />
        </radialGradient>
        {/* Beak gradient — warm orange */}
        <radialGradient id="pg-beak" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#F0983C" />
          <stop offset="100%" stopColor="#D87828" />
        </radialGradient>
        {/* Feet gradient */}
        <radialGradient id="pg-feet" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#F0983C" />
          <stop offset="100%" stopColor="#CC6E20" />
        </radialGradient>
        {/* Scarf gradient — cozy red */}
        <linearGradient id="pg-scarf" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#C44040" />
          <stop offset="50%" stopColor="#B83838" />
          <stop offset="100%" stopColor="#A83030" />
        </linearGradient>
        {/* Scarf stripe — white accent */}
        <linearGradient id="pg-scarf-stripe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
        </linearGradient>
        {/* Flipper gradient */}
        <radialGradient id="pg-flipper" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#263A5E" />
          <stop offset="100%" stopColor="#162038" />
        </radialGradient>
        {/* Ice-blue highlight for body sheen */}
        <radialGradient id="pg-sheen" cx="40%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#D7E0E8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#D7E0E8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* === Shadow === */}
      <ellipse className="tokki-shadow" cx="80" cy="148" rx="36" ry="7" />

      {/* === Feet (behind body) === */}
      <g className="tokki-feet">
        {/* Left foot — webbed */}
        <ellipse cx="65" cy="144" rx="14" ry="5" fill="url(#pg-feet)" stroke="#B06020" strokeWidth="1.2" />
        <path d="M54 144 L58 144" stroke="#B06020" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M58 144 L62 144" stroke="#B06020" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        {/* Right foot — webbed */}
        <ellipse cx="95" cy="144" rx="14" ry="5" fill="url(#pg-feet)" stroke="#B06020" strokeWidth="1.2" />
        <path d="M98 144 L102 144" stroke="#B06020" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M88 144 L92 144" stroke="#B06020" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </g>

      {/* === Body — round and squat, wider than tall === */}
      <ellipse
        className="tokki-body"
        cx="80"
        cy="110"
        rx="38"
        ry="34"
        fill="url(#pg-body)"
        stroke="rgba(10,18,36,0.3)"
        strokeWidth="1.8"
      />

      {/* Ice-blue body sheen */}
      <ellipse cx="68" cy="98" rx="22" ry="18" fill="url(#pg-sheen)" />

      {/* === Belly — large white oval on front === */}
      <ellipse cx="80" cy="114" rx="22" ry="26" fill="url(#pg-belly)" opacity="0.95" />

      {/* Belly folk-art accent — subtle geometric chevron pattern */}
      <path
        d="M72 106 L76 102 L80 106 L84 102 L88 106"
        fill="none"
        stroke="#D7E0E8"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <path
        d="M74 112 L77 109 L80 112 L83 109 L86 112"
        fill="none"
        stroke="#D7E0E8"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.25"
      />

      {/* === Flippers === */}
      <path
        className="tokki-flipper--left"
        d="M42 100 Q36 112 42 128 Q44 132 48 130 L50 110 Z"
        fill="url(#pg-flipper)"
        stroke="rgba(10,18,36,0.25)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        className="tokki-flipper--right"
        d="M118 100 Q124 112 118 128 Q116 132 112 130 L110 110 Z"
        fill="url(#pg-flipper)"
        stroke="rgba(10,18,36,0.25)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* === Head — round, blends into body === */}
      <circle
        className="tokki-head"
        cx="80"
        cy="64"
        r="30"
        fill="url(#pg-head)"
        stroke="rgba(32,40,52,0.2)"
        strokeWidth="1.8"
        style={{ fill: "url(#pg-head)", stroke: "rgba(32,40,52,0.2)" }}
      />

      {/* Head highlight */}
      <ellipse cx="72" cy="52" rx="12" ry="8" fill="#DCE4EC" opacity="0.16" />

      {/* === Eyes — cheerful and round === */}
      <g className="tokki-eye tokki-eye--left">
        <circle cx="72" cy="64" r="4.5" fill="#FFFFFF" />
        <circle cx="72" cy="64" r="4.5" fill="none" stroke="rgba(10,18,36,0.2)" strokeWidth="0.8" />
        <circle cx="72" cy="64" r="2.5" fill="#101824" />
        <circle cx="70.8" cy="62.8" r="1.3" fill="#FFFFFF" opacity="0.85" />
        <circle cx="73" cy="65" r="0.6" fill="#FFFFFF" opacity="0.45" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <circle cx="88" cy="64" r="4.5" fill="#FFFFFF" />
        <circle cx="88" cy="64" r="4.5" fill="none" stroke="rgba(10,18,36,0.2)" strokeWidth="0.8" />
        <circle cx="88" cy="64" r="2.5" fill="#101824" />
        <circle cx="86.8" cy="62.8" r="1.3" fill="#FFFFFF" opacity="0.85" />
        <circle cx="89" cy="65" r="0.6" fill="#FFFFFF" opacity="0.45" />
      </g>

      {/* Subtle brow arcs */}
      <path d="M66 58 Q72 55.5 78 58" fill="none" stroke="rgba(10,18,36,0.15)" strokeWidth="1" strokeLinecap="round" />
      <path d="M82 58 Q88 55.5 94 58" fill="none" stroke="rgba(10,18,36,0.15)" strokeWidth="1" strokeLinecap="round" />

      {/* === Cheeks — subtle pink spots === */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="63" cy="70" rx="5" ry="3" fill="url(#pg-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="97" cy="70" rx="5" ry="3" fill="url(#pg-cheek)" />

      {/* === Beak — small triangle pointing down === */}
      <path
        className="tokki-beak"
        d="M76 72 L80 79 L84 72 Z"
        fill="url(#pg-beak)"
        stroke="#B06820"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Beak highlight */}
      <path d="M78 73 L80 76 L82 73" fill="#F8B860" opacity="0.5" />

      {/* === Scarf — cozy red with white stripe, wrapped around neck === */}
      <g className="tokki-scarf">
        {/* Main scarf wrap */}
        <path
          d="M50 82 Q52 78 80 76 Q108 78 110 82 Q112 88 108 90 Q80 94 52 90 Q48 88 50 82 Z"
          fill="url(#pg-scarf)"
          stroke="rgba(120,20,20,0.3)"
          strokeWidth="1.2"
        />
        {/* White stripe across scarf */}
        <path
          d="M54 84 Q80 81 106 84"
          fill="none"
          stroke="url(#pg-scarf-stripe)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Second thin stripe */}
        <path
          d="M56 88 Q80 86 104 88"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.3"
        />
        {/* Flowing scarf end — left side with gentle wave */}
        <path
          d="M52 90 Q48 96 46 106 Q44 112 48 116 Q50 118 52 116 Q54 110 54 104 Q53 98 54 92"
          fill="url(#pg-scarf)"
          stroke="rgba(120,20,20,0.25)"
          strokeWidth="1"
        />
        {/* Scarf end white stripe */}
        <path
          d="M50 96 Q48 104 48 110"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />
        {/* Scarf end fringe — folk detail */}
        <line x1="46" y1="116" x2="44" y2="120" stroke="#C44040" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <line x1="48" y1="117" x2="47" y2="121" stroke="#C44040" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <line x1="50" y1="117" x2="50" y2="121" stroke="#C44040" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* === Folk art decorative details on body — tiny snowflake/star motifs === */}
      {/* Left side dot cluster */}
      <circle cx="56" cy="105" r="1" fill="#D7E0E8" opacity="0.3" />
      <circle cx="53" cy="108" r="0.7" fill="#D7E0E8" opacity="0.25" />
      <circle cx="58" cy="110" r="0.7" fill="#D7E0E8" opacity="0.25" />
      {/* Right side dot cluster */}
      <circle cx="104" cy="105" r="1" fill="#D7E0E8" opacity="0.3" />
      <circle cx="107" cy="108" r="0.7" fill="#D7E0E8" opacity="0.25" />
      <circle cx="102" cy="110" r="0.7" fill="#D7E0E8" opacity="0.25" />

      {/* Small diamond motif on head — folk pattern */}
      <path
        d="M80 44 L82 47 L80 50 L78 47 Z"
        fill="none"
        stroke="#D7E0E8"
        strokeWidth="0.8"
        opacity="0.3"
      />

      {/* === Tail — small rounded bump at back === */}
      <ellipse className="tokki-tail" cx="80" cy="140" rx="6" ry="4" fill="#707A86" stroke="rgba(10,18,36,0.2)" strokeWidth="1" />

      {/* === Zzz / Snore elements === */}
      <circle className="tokki-snore tokki-snore--a" cx="118" cy="54" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="125" cy="45" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="120" y="51" fontSize="10" fontWeight="bold" fill="#8b9eb4">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="127" y="39" fontSize="13" fontWeight="bold" fill="#8b9eb4">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="134" y="26" fontSize="16" fontWeight="bold" fill="#8b9eb4">Z</text>
    </svg>
  );
}

registerAvatar({
  id: "penguin_v1",
  label: "Penguin",
  emoji: "\u{1F427}",
  cssClass: "tokki-asset--penguin",
  Component: PenguinV1Asset,
  fx: {
    idle: { particle: "snow", count: [3, 5], zone: { x: [20, 140], y: [0, 60] }, intensity: 0.4 },
    playful: { particle: "snow", count: [5, 8], zone: { x: [10, 150], y: [0, 80] }, intensity: 0.7 },
  },
});
