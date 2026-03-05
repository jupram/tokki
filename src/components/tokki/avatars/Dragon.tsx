import { registerAvatar } from "./index";

function DragonV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--dragon"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Body: rich imperial red */}
        <radialGradient id="dr-body" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#D43030" />
          <stop offset="60%" stopColor="#B82020" />
          <stop offset="100%" stopColor="#8E1818" />
        </radialGradient>
        {/* Head: deeper crimson with warm center */}
        <radialGradient id="dr-head" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#DC3838" />
          <stop offset="100%" stopColor="#A02020" />
        </radialGradient>
        {/* Belly: warm cream-gold */}
        <radialGradient id="dr-belly" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFF5D6" />
          <stop offset="60%" stopColor="#F5E0A0" />
          <stop offset="100%" stopColor="#E8C868" />
        </radialGradient>
        {/* Gold accents for scales, horns, trim */}
        <radialGradient id="dr-gold" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFD848" />
          <stop offset="50%" stopColor="#E8B830" />
          <stop offset="100%" stopColor="#C89820" />
        </radialGradient>
        {/* Horn gradient: antler-brown with gold tips */}
        <linearGradient id="dr-horn" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#8B5E3C" />
          <stop offset="60%" stopColor="#A87040" />
          <stop offset="100%" stopColor="#E8B830" />
        </linearGradient>
        {/* Cheek glow: warm golden blush */}
        <radialGradient id="dr-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD080" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#E8A040" stopOpacity="0.12" />
        </radialGradient>
        {/* Paw fill: darker red */}
        <radialGradient id="dr-paw" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#B82828" />
          <stop offset="100%" stopColor="#8E1818" />
        </radialGradient>
        {/* Gold scale shimmer overlay */}
        <linearGradient id="dr-scale" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#FFD848" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#E8B830" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FFD848" stopOpacity="0.3" />
        </linearGradient>
        {/* Cloud motif: soft white */}
        <radialGradient id="dr-cloud" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* Tail gradient: red to gold tip */}
        <linearGradient id="dr-tail" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#B82020" />
          <stop offset="70%" stopColor="#A01818" />
          <stop offset="100%" stopColor="#E8B830" />
        </linearGradient>
        {/* Whisker gradient */}
        <linearGradient id="dr-whisker" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8E1818" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#E8B830" stopOpacity="0.15" />
        </linearGradient>
        {/* Smoke wisp from nostrils */}
        <radialGradient id="dr-smoke" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#BBAAAA" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#BBAAAA" stopOpacity="0" />
        </radialGradient>
        {/* Mane gradient: flowing golden-orange */}
        <linearGradient id="dr-mane" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#FFD848" />
          <stop offset="50%" stopColor="#E89830" />
          <stop offset="100%" stopColor="#D07020" />
        </linearGradient>
        {/* Body red-to-gold highlight sheen */}
        <radialGradient id="dr-sheen" cx="40%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#FF8080" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FF8080" stopOpacity="0" />
        </radialGradient>
        {/* Dorsal ridge crimson-gold */}
        <linearGradient id="dr-ridge" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#D43030" />
          <stop offset="100%" stopColor="#FFD848" />
        </linearGradient>
      </defs>

      {/* === Shadow === */}
      <ellipse className="tokki-shadow" cx="80" cy="144" rx="38" ry="7" />

      {/* === Serpentine tail with cloud-scroll curl === */}
      <path
        className="tokki-tail"
        d="M106 120 Q128 112 138 96 Q144 82 136 68 Q128 58 122 64
           Q116 70 120 78 Q126 88 118 94"
        fill="none"
        stroke="url(#dr-tail)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Tail outline */}
      <path
        d="M106 120 Q128 112 138 96 Q144 82 136 68 Q128 58 122 64
           Q116 70 120 78 Q126 88 118 94"
        fill="none"
        stroke="rgba(80,10,10,0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Gold scale arcs along tail */}
      <path d="M128 100 Q131 96 128 92" fill="none" stroke="url(#dr-scale)" strokeWidth="2" strokeLinecap="round" />
      <path d="M136 84 Q138 80 135 76" fill="none" stroke="url(#dr-scale)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M128 72 Q126 68 128 64" fill="none" stroke="url(#dr-scale)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Gold ornamental tip -- cloud pearl */}
      <circle cx="118" cy="94" r="5" fill="url(#dr-gold)" stroke="rgba(80,10,10,0.15)" strokeWidth="0.8" />
      <circle cx="118" cy="94" r="2.8" fill="#FFE878" opacity="0.6" />
      <circle cx="116.5" cy="92.5" r="1.2" fill="#FFF" opacity="0.35" />

      {/* === Sinuous body -- slightly elongated for serpentine feel === */}
      <ellipse
        className="tokki-body"
        cx="80"
        cy="112"
        rx="28"
        ry="24"
        fill="url(#dr-body)"
        stroke="rgba(80,10,10,0.22)"
        strokeWidth="1.8"
      />
      {/* Red body sheen highlight */}
      <ellipse cx="72" cy="102" rx="16" ry="12" fill="url(#dr-sheen)" />

      {/* Gold scale pattern on body -- overlapping arcs */}
      <path d="M64 104 Q68 100 72 104" fill="none" stroke="url(#dr-scale)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M72 108 Q76 104 80 108" fill="none" stroke="url(#dr-scale)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M80 104 Q84 100 88 104" fill="none" stroke="url(#dr-scale)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M88 108 Q92 104 96 108" fill="none" stroke="url(#dr-scale)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M68 112 Q72 108 76 112" fill="none" stroke="url(#dr-scale)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M84 112 Q88 108 92 112" fill="none" stroke="url(#dr-scale)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M76 116 Q80 112 84 116" fill="none" stroke="url(#dr-scale)" strokeWidth="1.2" strokeLinecap="round" />

      {/* Cloud swirl motifs on body -- traditional Chinese auspicious clouds */}
      <path
        d="M58 108 Q54 104 58 100 Q62 96 66 100"
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse cx="62" cy="103" rx="4" ry="3" fill="url(#dr-cloud)" />
      <path
        d="M94 100 Q98 96 102 100 Q106 104 102 108"
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse cx="98" cy="103" rx="4" ry="3" fill="url(#dr-cloud)" />

      {/* Belly: cream-gold underbelly */}
      <ellipse cx="80" cy="116" rx="16" ry="13" fill="url(#dr-belly)" opacity="0.8" />
      {/* Gold belly trim -- ornamental border */}
      <path
        d="M66 108 Q72 104 80 104 Q88 104 94 108"
        fill="none"
        stroke="#E8B830"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Fine belly scale lines */}
      <path d="M72 110 L72 120" fill="none" stroke="#E8B830" strokeWidth="0.4" opacity="0.3" />
      <path d="M76 109 L76 121" fill="none" stroke="#E8B830" strokeWidth="0.4" opacity="0.3" />
      <path d="M80 108 L80 122" fill="none" stroke="#E8B830" strokeWidth="0.4" opacity="0.3" />
      <path d="M84 109 L84 121" fill="none" stroke="#E8B830" strokeWidth="0.4" opacity="0.3" />
      <path d="M88 110 L88 120" fill="none" stroke="#E8B830" strokeWidth="0.4" opacity="0.3" />

      {/* === Elongated neck connecting body to head === */}
      <path
        d="M70 96 Q70 82 72 72 L88 72 Q90 82 90 96"
        fill="url(#dr-body)"
        stroke="rgba(80,10,10,0.15)"
        strokeWidth="1.2"
      />
      {/* Neck gold scale arcs */}
      <path d="M74 88 Q80 85 86 88" fill="none" stroke="url(#dr-scale)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M75 82 Q80 79 85 82" fill="none" stroke="url(#dr-scale)" strokeWidth="1" strokeLinecap="round" />
      <path d="M76 76 Q80 73 84 76" fill="none" stroke="url(#dr-scale)" strokeWidth="0.8" strokeLinecap="round" />

      {/* === Golden mane flowing behind head === */}
      <g opacity="0.85">
        {/* Left mane tuft */}
        <path
          d="M56 54 Q48 58 44 68 Q42 74 46 78 Q50 80 52 74 Q54 66 56 60"
          fill="url(#dr-mane)"
          stroke="rgba(180,100,20,0.2)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Right mane tuft */}
        <path
          d="M104 54 Q112 58 116 68 Q118 74 114 78 Q110 80 108 74 Q106 66 104 60"
          fill="url(#dr-mane)"
          stroke="rgba(180,100,20,0.2)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Center mane crest */}
        <path
          d="M72 42 Q68 36 70 28 Q72 24 76 30 Q78 36 78 42"
          fill="url(#dr-mane)"
          stroke="rgba(180,100,20,0.15)"
          strokeWidth="0.8"
          opacity="0.7"
        />
        <path
          d="M88 42 Q92 36 90 28 Q88 24 84 30 Q82 36 82 42"
          fill="url(#dr-mane)"
          stroke="rgba(180,100,20,0.15)"
          strokeWidth="0.8"
          opacity="0.7"
        />
      </g>

      {/* === Horns / antlers (using tokki-ear for animation compat) === */}
      <g className="tokki-ear tokki-ear--left">
        {/* Left horn -- deer antler style */}
        <path
          d="M58 48 Q50 30 46 16 Q44 10 48 12 Q52 16 54 24"
          fill="none"
          stroke="url(#dr-horn)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Antler branch */}
        <path
          d="M50 28 Q44 22 42 16"
          fill="none"
          stroke="url(#dr-horn)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Gold tip ornament */}
        <circle cx="46" cy="14" r="2.2" fill="#FFD848" stroke="rgba(80,40,10,0.2)" strokeWidth="0.5" />
        <circle cx="42" cy="16" r="1.8" fill="#FFD848" stroke="rgba(80,40,10,0.2)" strokeWidth="0.5" />
      </g>
      <g className="tokki-ear tokki-ear--right">
        {/* Right horn -- deer antler style */}
        <path
          d="M102 48 Q110 30 114 16 Q116 10 112 12 Q108 16 106 24"
          fill="none"
          stroke="url(#dr-horn)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Antler branch */}
        <path
          d="M110 28 Q116 22 118 16"
          fill="none"
          stroke="url(#dr-horn)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Gold tip ornament */}
        <circle cx="114" cy="14" r="2.2" fill="#FFD848" stroke="rgba(80,40,10,0.2)" strokeWidth="0.5" />
        <circle cx="118" cy="16" r="1.8" fill="#FFD848" stroke="rgba(80,40,10,0.2)" strokeWidth="0.5" />
      </g>

      {/* === Head -- rounded diamond shape, prominent for Chinese dragon === */}
      <g className="tokki-head">
        <path
          d="M80 38 Q56 40 50 56 Q46 70 54 82
             Q62 92 80 94 Q98 92 106 82
             Q114 70 110 56 Q104 40 80 38 Z"
          fill="url(#dr-head)"
          stroke="rgba(80,10,10,0.22)"
          strokeWidth="1.8"
        />
        {/* Prominent brow ridges */}
        <path d="M54 54 Q62 48 72 52" fill="none" stroke="rgba(120,20,20,0.25)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M106 54 Q98 48 88 52" fill="none" stroke="rgba(120,20,20,0.25)" strokeWidth="1.8" strokeLinecap="round" />

        {/* Auspicious cloud scroll on forehead */}
        <path
          d="M70 46 Q74 42 78 46 Q82 42 86 46 Q90 42 94 46"
          fill="none"
          stroke="rgba(255,215,80,0.3)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <ellipse cx="80" cy="44" rx="6" ry="3" fill="url(#dr-cloud)" />

        {/* Gold forehead pearl -- traditional dragon element */}
        <circle cx="80" cy="48" r="3.5" fill="url(#dr-gold)" stroke="rgba(80,40,10,0.25)" strokeWidth="0.8" />
        <circle cx="80" cy="48" r="2" fill="#FFE878" opacity="0.7" />
        <circle cx="79" cy="47" r="0.9" fill="#FFF" opacity="0.5" />

        {/* Head scale shimmer markings */}
        <path d="M62 60 Q66 57 70 60" fill="none" stroke="url(#dr-scale)" strokeWidth="1" strokeLinecap="round" />
        <path d="M90 60 Q94 57 98 60" fill="none" stroke="url(#dr-scale)" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* === Eyes -- golden slit pupils, jewel-like === */}
      <g className="tokki-eye tokki-eye--left">
        {/* Outer golden iris */}
        <ellipse cx="68" cy="66" rx="6.5" ry="6" fill="#E8B830" />
        <ellipse cx="68" cy="66" rx="6.5" ry="6" fill="none" stroke="rgba(80,20,10,0.3)" strokeWidth="1" />
        {/* Inner iris warm glow */}
        <ellipse cx="68" cy="66" rx="5" ry="4.5" fill="#FFD040" opacity="0.6" />
        {/* Amber ring */}
        <ellipse cx="68" cy="66" rx="3.5" ry="3.2" fill="none" stroke="#D09020" strokeWidth="0.6" opacity="0.5" />
        {/* Vertical slit pupil */}
        <ellipse cx="68" cy="66" rx="1.5" ry="5.5" fill="#181010" />
        {/* Specular highlights */}
        <ellipse cx="66.2" cy="64" rx="1.8" ry="1.6" fill="#FFF" opacity="0.85" />
        <ellipse cx="69.2" cy="68" rx="0.9" ry="0.9" fill="#FFF" opacity="0.4" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="92" cy="66" rx="6.5" ry="6" fill="#E8B830" />
        <ellipse cx="92" cy="66" rx="6.5" ry="6" fill="none" stroke="rgba(80,20,10,0.3)" strokeWidth="1" />
        <ellipse cx="92" cy="66" rx="5" ry="4.5" fill="#FFD040" opacity="0.6" />
        <ellipse cx="92" cy="66" rx="3.5" ry="3.2" fill="none" stroke="#D09020" strokeWidth="0.6" opacity="0.5" />
        <ellipse cx="92" cy="66" rx="1.5" ry="5.5" fill="#181010" />
        <ellipse cx="90.2" cy="64" rx="1.8" ry="1.6" fill="#FFF" opacity="0.85" />
        <ellipse cx="93.2" cy="68" rx="0.9" ry="0.9" fill="#FFF" opacity="0.4" />
      </g>

      {/* === Cheek glow -- warm golden blush === */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="56" cy="76" rx="6.5" ry="3.5" fill="url(#dr-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="104" cy="76" rx="6.5" ry="3.5" fill="url(#dr-cheek)" />

      {/* === Nostrils -- wide-set dragon nostrils === */}
      <ellipse className="tokki-nose" cx="74" cy="80" rx="3" ry="2.2" fill="#8E1818" />
      <ellipse cx="86" cy="80" rx="3" ry="2.2" fill="#8E1818" />
      {/* Nostril highlights */}
      <ellipse cx="74" cy="79.5" rx="1.2" ry="0.7" fill="#B82828" opacity="0.5" />
      <ellipse cx="86" cy="79.5" rx="1.2" ry="0.7" fill="#B82828" opacity="0.5" />

      {/* === Smoke wisps curling from nostrils === */}
      <g className="tokki-smoke" opacity="0.3">
        <path d="M72 78 Q68 72 70 66 Q72 62 68 58" fill="none" stroke="url(#dr-smoke)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M88 78 Q92 73 90 68 Q88 64 92 60" fill="none" stroke="url(#dr-smoke)" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="68" cy="58" rx="3" ry="2" fill="url(#dr-smoke)" />
        <ellipse cx="92" cy="60" rx="2.5" ry="1.8" fill="url(#dr-smoke)" />
      </g>

      {/* === Whiskers -- long flowing traditional whiskers === */}
      <g opacity="0.7">
        {/* Left whiskers */}
        <path
          d="M56 74 Q40 68 28 72 Q22 74 24 70"
          fill="none"
          stroke="url(#dr-whisker)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M56 78 Q42 80 32 84 Q26 86 28 82"
          fill="none"
          stroke="url(#dr-whisker)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Right whiskers */}
        <path
          d="M104 74 Q120 68 132 72 Q138 74 136 70"
          fill="none"
          stroke="url(#dr-whisker)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M104 78 Q118 80 128 84 Q134 86 132 82"
          fill="none"
          stroke="url(#dr-whisker)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>

      {/* === Mouth -- cute smile with tiny fangs === */}
      <path
        className="tokki-mouth"
        d="M72 86 Q76 90 80 88 Q84 90 88 86"
        fill="none"
        stroke="#8E1818"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Left tiny fang */}
      <path d="M74 86 L73 90 L76 87" fill="#FFF8F0" stroke="rgba(80,10,10,0.2)" strokeWidth="0.5" strokeLinejoin="round" />
      {/* Right tiny fang */}
      <path d="M86 86 L87 90 L84 87" fill="#FFF8F0" stroke="rgba(80,10,10,0.2)" strokeWidth="0.5" strokeLinejoin="round" />

      {/* === Dorsal spine ridge -- small crimson-gold triangles along head top === */}
      <g opacity="0.75">
        <polygon points="77,38 80,31 83,38" fill="url(#dr-ridge)" stroke="rgba(80,10,10,0.15)" strokeWidth="0.6" />
        <polygon points="72,40 75,35 78,40" fill="url(#dr-ridge)" stroke="rgba(80,10,10,0.12)" strokeWidth="0.5" opacity="0.7" />
        <polygon points="82,40 85,35 88,40" fill="url(#dr-ridge)" stroke="rgba(80,10,10,0.12)" strokeWidth="0.5" opacity="0.7" />
      </g>

      {/* === Zzz / snore elements === */}
      <circle className="tokki-snore tokki-snore--a" cx="118" cy="58" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="125" cy="49" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="120" y="55" fontSize="10" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="127" y="43" fontSize="13" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="134" y="30" fontSize="16" fontWeight="bold" fill="#8b7e74">Z</text>

      {/* === Front paws -- small with gold claws === */}
      <ellipse className="tokki-paw tokki-paw--left" cx="64" cy="114" rx="10" ry="8" fill="url(#dr-paw)" stroke="rgba(80,10,10,0.2)" strokeWidth="1.2" />
      <ellipse className="tokki-paw tokki-paw--right" cx="96" cy="114" rx="10" ry="8" fill="url(#dr-paw)" stroke="rgba(80,10,10,0.2)" strokeWidth="1.2" />
      {/* Gold claw details -- left paw */}
      <path d="M58 116 L56 120" stroke="#E8B830" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M61 117 L59 121" stroke="#E8B830" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M64 118 L63 121" stroke="#E8B830" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      {/* Gold claw details -- right paw */}
      <path d="M102 116 L104 120" stroke="#E8B830" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M99 117 L101 121" stroke="#E8B830" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M96 118 L97 121" stroke="#E8B830" strokeWidth="1" strokeLinecap="round" opacity="0.7" />

      {/* === Hind feet === */}
      <ellipse cx="68" cy="134" rx="11" ry="5.5" fill="url(#dr-paw)" stroke="rgba(80,10,10,0.16)" strokeWidth="1.2" />
      <ellipse cx="92" cy="134" rx="11" ry="5.5" fill="url(#dr-paw)" stroke="rgba(80,10,10,0.16)" strokeWidth="1.2" />
      {/* Hind feet claws */}
      <path d="M62 136 L60 139" stroke="#E8B830" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      <path d="M66 137 L64 140" stroke="#E8B830" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      <path d="M70 137 L69 140" stroke="#E8B830" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      <path d="M98 136 L100 139" stroke="#E8B830" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      <path d="M94 137 L96 140" stroke="#E8B830" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      <path d="M90 137 L91 140" stroke="#E8B830" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />

      {/* === Ornamental gold accent dots -- traditional motif === */}
      <circle cx="58" cy="98" r="1.4" fill="#FFD848" opacity="0.4" />
      <circle cx="102" cy="98" r="1.4" fill="#FFD848" opacity="0.4" />
      <circle cx="80" cy="126" r="1.2" fill="#FFD848" opacity="0.35" />
      <circle cx="52" cy="88" r="1" fill="#FFD848" opacity="0.3" />
      <circle cx="108" cy="88" r="1" fill="#FFD848" opacity="0.3" />
    </svg>
  );
}

registerAvatar({
  id: "dragon_v1",
  label: "Dragon",
  emoji: "\u{1F409}",
  cssClass: "tokki-asset--dragon",
  Component: DragonV1Asset,
  fx: {
    surprised: { particle: "ember", count: [4, 7], zone: { x: [30, 130], y: [20, 80] }, intensity: 0.8 },
    playful: { particle: "ember", count: [3, 5], zone: { x: [40, 120], y: [30, 90] }, intensity: 0.5 },
  },
});
