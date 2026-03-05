import { registerAvatar } from "./index";

function DogV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--dog"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Body gradient — warm golden-brown */}
        <radialGradient id="dg-body" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#E0974F" />
          <stop offset="100%" stopColor="#D4894A" />
        </radialGradient>
        {/* Belly — creamy off-white */}
        <radialGradient id="dg-belly" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFF5E6" />
          <stop offset="100%" stopColor="#FFE8C8" />
        </radialGradient>
        {/* Ear — darker warm brown */}
        <radialGradient id="dg-ear" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#B87038" />
          <stop offset="100%" stopColor="#9A5A28" />
        </radialGradient>
        {/* Ear inner — soft rosy pink */}
        <radialGradient id="dg-ear-inner" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#F0BCA0" />
          <stop offset="100%" stopColor="#D89878" />
        </radialGradient>
        {/* Cheeks — warm blush */}
        <radialGradient id="dg-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5B8A0" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#E89080" stopOpacity="0.25" />
        </radialGradient>
        {/* Paw — light tan */}
        <radialGradient id="dg-paw" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFE8CC" />
          <stop offset="100%" stopColor="#F0D0A8" />
        </radialGradient>
        {/* Nose — big wet nose */}
        <radialGradient id="dg-nose" cx="40%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#3A2A20" />
          <stop offset="100%" stopColor="#1A1210" />
        </radialGradient>
        {/* Muzzle — lighter cream mask area */}
        <radialGradient id="dg-muzzle" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#FFF5E6" />
          <stop offset="70%" stopColor="#FFE8CC" />
          <stop offset="100%" stopColor="#F5D8B0" stopOpacity="0" />
        </radialGradient>
        {/* Tongue — vibrant pink */}
        <radialGradient id="dg-tongue" cx="50%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#F07888" />
          <stop offset="100%" stopColor="#D85868" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse className="tokki-shadow" cx="80" cy="138" rx="40" ry="8" />

      {/* Stocky body — wide and round */}
      <ellipse
        className="tokki-body"
        cx="80"
        cy="108"
        rx="30"
        ry="24"
        fill="url(#dg-body)"
        stroke="#3A2218"
        strokeWidth="2.5"
      />
      {/* Belly patch */}
      <ellipse cx="80" cy="113" rx="18" ry="14" fill="url(#dg-belly)" opacity="0.8" />

      {/* Tail — thick, upright, wagging-style curve */}
      <path
        className="tokki-tail"
        d="M110 106 Q130 94 132 72 Q133 58 126 48 Q122 42 124 36"
        fill="none"
        stroke="url(#dg-body)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Tail outline */}
      <path
        d="M110 106 Q130 94 132 72 Q133 58 126 48 Q122 42 124 36"
        fill="none"
        stroke="#3A2218"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Tail tip highlight */}
      <circle cx="124" cy="37" r="5" fill="#E0974F" stroke="#3A2218" strokeWidth="2" />
      <circle cx="123" cy="36" r="2" fill="#F5C48A" opacity="0.6" />

      {/* Floppy ears — left (behind head) */}
      <g className="tokki-ear tokki-ear--left">
        <path
          className="tokki-ear-shell"
          d="M50 62 Q38 58 30 72 Q24 84 28 96 Q30 100 36 100 Q42 98 46 88 Q50 78 50 62 Z"
          fill="url(#dg-ear)"
          stroke="#3A2218"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          className="tokki-ear-inner"
          d="M46 68 Q38 66 34 76 Q30 86 34 94 Q38 94 42 86 Q46 78 46 68 Z"
          fill="url(#dg-ear-inner)"
          opacity="0.7"
        />
      </g>
      {/* Floppy ears — right (behind head) */}
      <g className="tokki-ear tokki-ear--right">
        <path
          className="tokki-ear-shell"
          d="M110 62 Q122 58 130 72 Q136 84 132 96 Q130 100 124 100 Q118 98 114 88 Q110 78 110 62 Z"
          fill="url(#dg-ear)"
          stroke="#3A2218"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          className="tokki-ear-inner"
          d="M114 68 Q122 66 126 76 Q130 86 126 94 Q122 94 118 86 Q114 78 114 68 Z"
          fill="url(#dg-ear-inner)"
          opacity="0.7"
        />
      </g>

      {/* Big round head */}
      <circle
        className="tokki-head"
        cx="80"
        cy="72"
        r="40"
        fill="url(#dg-body)"
        stroke="#3A2218"
        strokeWidth="2.5"
      />

      {/* Muzzle/snout — lighter area lower-center of face */}
      <ellipse cx="80" cy="82" rx="20" ry="16" fill="url(#dg-muzzle)" opacity="0.9" />

      {/* Brow ridges — bold retro style */}
      <path d="M57 58 Q65 53 73 57" fill="none" stroke="#3A2218" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M87 57 Q95 53 103 58" fill="none" stroke="#3A2218" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wide happy eyes — left */}
      <g className="tokki-eye tokki-eye--left">
        <ellipse cx="66" cy="68" rx="7" ry="7" fill="#FFFDF8" />
        <ellipse cx="66" cy="68" rx="7" ry="7" fill="none" stroke="#3A2218" strokeWidth="2" />
        <ellipse cx="66" cy="68" rx="4.5" ry="4.5" fill="#4A2A18" />
        <ellipse cx="64" cy="66" rx="2.2" ry="2.2" fill="#fff" opacity="0.9" />
        <ellipse cx="68" cy="70" rx="1" ry="1" fill="#fff" opacity="0.5" />
      </g>
      {/* Wide happy eyes — right */}
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="94" cy="68" rx="7" ry="7" fill="#FFFDF8" />
        <ellipse cx="94" cy="68" rx="7" ry="7" fill="none" stroke="#3A2218" strokeWidth="2" />
        <ellipse cx="94" cy="68" rx="4.5" ry="4.5" fill="#4A2A18" />
        <ellipse cx="92" cy="66" rx="2.2" ry="2.2" fill="#fff" opacity="0.9" />
        <ellipse cx="96" cy="70" rx="1" ry="1" fill="#fff" opacity="0.5" />
      </g>

      {/* Rosy cheeks */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="52" cy="80" rx="8" ry="5" fill="url(#dg-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="108" cy="80" rx="8" ry="5" fill="url(#dg-cheek)" />

      {/* Big wet nose — prominent */}
      <ellipse className="tokki-nose" cx="80" cy="80" rx="6" ry="4.5" fill="url(#dg-nose)" stroke="#1A1210" strokeWidth="1" />
      {/* Nose highlight — glossy wet look */}
      <ellipse cx="78" cy="78.5" rx="2" ry="1.3" fill="#6A5A50" opacity="0.5" />
      <ellipse cx="77.5" cy="78" rx="1.2" ry="0.8" fill="#fff" opacity="0.55" />
      {/* Nostrils */}
      <ellipse cx="77.5" cy="81" rx="1.2" ry="0.8" fill="#0A0808" opacity="0.6" />
      <ellipse cx="82.5" cy="81" rx="1.2" ry="0.8" fill="#0A0808" opacity="0.6" />

      {/* Wide smile */}
      <path
        className="tokki-mouth"
        d="M68 87 Q74 94 80 94 Q86 94 92 87"
        fill="none"
        stroke="#3A2218"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Tongue — hanging out the center */}
      <ellipse cx="80" cy="95" rx="5" ry="4.5" fill="url(#dg-tongue)" stroke="#3A2218" strokeWidth="1.8" />
      <ellipse cx="80" cy="94" rx="2.5" ry="2" fill="#F8A0A8" opacity="0.5" />
      {/* Tongue center line */}
      <line x1="80" y1="91.5" x2="80" y2="98" stroke="#C84858" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />

      {/* Zzz / snore elements */}
      <circle className="tokki-snore tokki-snore--a" cx="118" cy="58" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="126" cy="48" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="120" y="55" fontSize="10" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="128" y="43" fontSize="13" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="134" y="30" fontSize="16" fontWeight="bold" fill="#8b7e74">Z</text>

      {/* Front paws — stocky, wide */}
      <ellipse className="tokki-paw tokki-paw--left" cx="62" cy="108" rx="12" ry="9" fill="url(#dg-paw)" stroke="#3A2218" strokeWidth="2.5" />
      <ellipse className="tokki-paw tokki-paw--right" cx="98" cy="108" rx="12" ry="9" fill="url(#dg-paw)" stroke="#3A2218" strokeWidth="2.5" />
      {/* Paw toe-beans — left */}
      <ellipse cx="58" cy="110" rx="2.5" ry="2" fill="#E0B0A0" opacity="0.55" />
      <ellipse cx="62" cy="111" rx="2.5" ry="2" fill="#E0B0A0" opacity="0.55" />
      <ellipse cx="66" cy="110" rx="2.5" ry="2" fill="#E0B0A0" opacity="0.55" />
      <ellipse cx="62" cy="114" rx="3" ry="2.2" fill="#E0B0A0" opacity="0.4" />
      {/* Paw toe-beans — right */}
      <ellipse cx="94" cy="110" rx="2.5" ry="2" fill="#E0B0A0" opacity="0.55" />
      <ellipse cx="98" cy="111" rx="2.5" ry="2" fill="#E0B0A0" opacity="0.55" />
      <ellipse cx="102" cy="110" rx="2.5" ry="2" fill="#E0B0A0" opacity="0.55" />
      <ellipse cx="98" cy="114" rx="3" ry="2.2" fill="#E0B0A0" opacity="0.4" />

      {/* Back feet / hind paws */}
      <ellipse cx="66" cy="130" rx="12" ry="6" fill="url(#dg-paw)" stroke="#3A2218" strokeWidth="2" />
      <ellipse cx="94" cy="130" rx="12" ry="6" fill="url(#dg-paw)" stroke="#3A2218" strokeWidth="2" />
      {/* Foot toe lines — left */}
      <line x1="60" y1="128" x2="60" y2="133" stroke="#C8A888" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="66" y1="127" x2="66" y2="134" stroke="#C8A888" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="72" y1="128" x2="72" y2="133" stroke="#C8A888" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      {/* Foot toe lines — right */}
      <line x1="88" y1="128" x2="88" y2="133" stroke="#C8A888" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="94" y1="127" x2="94" y2="134" stroke="#C8A888" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="100" y1="128" x2="100" y2="133" stroke="#C8A888" strokeWidth="1" strokeLinecap="round" opacity="0.4" />

      {/* Forehead spot — small warm marking */}
      <ellipse cx="80" cy="55" rx="5" ry="3.5" fill="#C87838" opacity="0.35" />

      {/* Eyebrow dots — retro cartoon detail */}
      <circle cx="66" cy="57" r="1.2" fill="#3A2218" opacity="0.2" />
      <circle cx="94" cy="57" r="1.2" fill="#3A2218" opacity="0.2" />
    </svg>
  );
}

registerAvatar({
  id: "dog_v1",
  label: "Dog",
  emoji: "\u{1F436}",
  cssClass: "tokki-asset--dog",
  Component: DogV1Asset,
  fx: {},
});
