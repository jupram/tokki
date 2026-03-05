import { registerAvatar } from "./index";

function TurtleV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--turtle"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Body / skin gradient — forest green */}
        <radialGradient id="tt-skin" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#3e7a34" />
          <stop offset="100%" stopColor="#2D5A27" />
        </radialGradient>

        {/* Shell base gradient — warm terracotta */}
        <radialGradient id="tt-shell" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#c96e42" />
          <stop offset="60%" stopColor="#B85C38" />
          <stop offset="100%" stopColor="#8f4228" />
        </radialGradient>

        {/* Shell highlight dome */}
        <radialGradient id="tt-shell-highlight" cx="42%" cy="32%" r="40%">
          <stop offset="0%" stopColor="#e8a070" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#B85C38" stopOpacity="0" />
        </radialGradient>

        {/* Tribal pattern — ocean blue */}
        <radialGradient id="tt-tribal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2e7ec0" />
          <stop offset="100%" stopColor="#2266AA" />
        </radialGradient>

        {/* Pattern glow for mood pulse */}
        <radialGradient id="tt-pattern-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3da8ff" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#2266AA" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2266AA" stopOpacity="0" />
        </radialGradient>

        {/* Belly / undershell gradient */}
        <radialGradient id="tt-belly" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#e8d4a0" />
          <stop offset="100%" stopColor="#c4a870" />
        </radialGradient>

        {/* Leg gradient */}
        <radialGradient id="tt-leg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#3e7a34" />
          <stop offset="100%" stopColor="#24501e" />
        </radialGradient>

        {/* Head gradient */}
        <radialGradient id="tt-head" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#4a8c3e" />
          <stop offset="100%" stopColor="#2D5A27" />
        </radialGradient>

        {/* Cheek blush */}
        <radialGradient id="tt-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#88c07a" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#5a9a4e" stopOpacity="0.2" />
        </radialGradient>

        {/* Eye warm highlight */}
        <radialGradient id="tt-eye-warm" cx="40%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#3a2810" />
          <stop offset="100%" stopColor="#1a1008" />
        </radialGradient>

        {/* Clip path for shell patterns */}
        <clipPath id="tt-shell-clip">
          <ellipse cx="82" cy="82" rx="46" ry="38" />
        </clipPath>
      </defs>

      {/* === Ground shadow === */}
      <ellipse className="tokki-shadow" cx="80" cy="146" rx="42" ry="8" />

      {/* === Back legs (behind shell) === */}
      <g className="tokki-leg tokki-leg--back-left">
        <ellipse cx="50" cy="126" rx="10" ry="7" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.25)" strokeWidth="1.2" />
        {/* Toe nubs */}
        <circle cx="43" cy="130" r="2.5" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="0.8" />
        <circle cx="47" cy="132" r="2.2" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="0.8" />
      </g>
      <g className="tokki-leg tokki-leg--back-right">
        <ellipse cx="114" cy="126" rx="10" ry="7" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.25)" strokeWidth="1.2" />
        <circle cx="121" cy="130" r="2.5" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="0.8" />
        <circle cx="117" cy="132" r="2.2" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="0.8" />
      </g>

      {/* === Tail stub (behind shell, right side) === */}
      <g className="tokki-tail">
        <ellipse cx="130" cy="108" rx="6" ry="4" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="1" transform="rotate(-20,130,108)" />
        <circle cx="135" cy="106" r="2.5" fill="#3e7a34" opacity="0.8" />
      </g>

      {/* === Shell — massive domed feature === */}
      <g className="tokki-shell">
        {/* Shell base — large dome */}
        <ellipse className="tokki-body" cx="82" cy="82" rx="46" ry="38" fill="url(#tt-shell)" stroke="rgba(80,35,15,0.35)" strokeWidth="2" />

        {/* Dome highlight */}
        <ellipse cx="72" cy="72" rx="32" ry="24" fill="url(#tt-shell-highlight)" />

        {/* Shell belly edge visible at bottom */}
        <path d="M42 98 Q62 112 82 112 Q102 112 122 98" fill="url(#tt-belly)" opacity="0.5" stroke="rgba(80,35,15,0.15)" strokeWidth="1" />

        {/* === Polynesian tribal patterns on shell === */}
        <g className="tokki-shell-pattern" clipPath="url(#tt-shell-clip)">

          {/* Central concentric circles — koru/spiral motif */}
          <circle cx="82" cy="78" r="18" fill="none" stroke="#2266AA" strokeWidth="2.2" opacity="0.8" />
          <circle cx="82" cy="78" r="13" fill="none" stroke="#2266AA" strokeWidth="1.8" opacity="0.7" />
          <circle cx="82" cy="78" r="8" fill="none" stroke="#2e7ec0" strokeWidth="1.5" opacity="0.65" />
          <circle cx="82" cy="78" r="3.5" fill="#2266AA" opacity="0.6" />

          {/* Radiating lines from center — sun/compass motif */}
          <line x1="82" y1="60" x2="82" y2="54" stroke="#2266AA" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <line x1="82" y1="96" x2="82" y2="102" stroke="#2266AA" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <line x1="64" y1="78" x2="58" y2="78" stroke="#2266AA" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <line x1="100" y1="78" x2="106" y2="78" stroke="#2266AA" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <line x1="70" y1="66" x2="66" y2="62" stroke="#2266AA" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
          <line x1="94" y1="66" x2="98" y2="62" stroke="#2266AA" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
          <line x1="70" y1="90" x2="66" y2="94" stroke="#2266AA" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
          <line x1="94" y1="90" x2="98" y2="94" stroke="#2266AA" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />

          {/* Wave pattern band — top arc (ocean waves) */}
          <path d="M44 68 Q50 62 56 68 Q62 74 68 68 Q74 62 80 68 Q86 74 92 68 Q98 62 104 68 Q110 74 116 68" fill="none" stroke="#B85C38" strokeWidth="1.5" opacity="0.55" strokeLinecap="round" />
          <path d="M48 72 Q54 66 60 72 Q66 78 72 72 Q78 66 84 72 Q90 78 96 72 Q102 66 108 72 Q114 78 120 72" fill="none" stroke="#B85C38" strokeWidth="1" opacity="0.35" strokeLinecap="round" />

          {/* Wave pattern band — bottom arc */}
          <path d="M46 92 Q52 86 58 92 Q64 98 70 92 Q76 86 82 92 Q88 98 94 92 Q100 86 106 92 Q112 98 118 92" fill="none" stroke="#B85C38" strokeWidth="1.5" opacity="0.55" strokeLinecap="round" />

          {/* Triangular border pattern — left side (shark teeth / niho taniwha) */}
          <polygon points="42,72 48,78 42,84" fill="#2266AA" opacity="0.4" />
          <polygon points="42,82 48,88 42,94" fill="#2e7ec0" opacity="0.35" />
          <polygon points="44,64 50,70 44,76" fill="#2266AA" opacity="0.3" />

          {/* Triangular border pattern — right side */}
          <polygon points="122,72 116,78 122,84" fill="#2266AA" opacity="0.4" />
          <polygon points="122,82 116,88 122,94" fill="#2e7ec0" opacity="0.35" />
          <polygon points="120,64 114,70 120,76" fill="#2266AA" opacity="0.3" />

          {/* Diamond dots between the rings — small decorative tapa elements */}
          <rect x="80" y="61" width="4" height="4" fill="#2266AA" opacity="0.5" transform="rotate(45,82,63)" />
          <rect x="80" y="91" width="4" height="4" fill="#2266AA" opacity="0.5" transform="rotate(45,82,93)" />
          <rect x="60" y="76" width="4" height="4" fill="#2266AA" opacity="0.5" transform="rotate(45,62,78)" />
          <rect x="100" y="76" width="4" height="4" fill="#2266AA" opacity="0.5" transform="rotate(45,102,78)" />

          {/* Small circles along the wave crests — representing islands/seeds */}
          <circle cx="56" cy="68" r="1.5" fill="#c96e42" opacity="0.6" />
          <circle cx="68" cy="68" r="1.5" fill="#c96e42" opacity="0.6" />
          <circle cx="80" cy="68" r="1.5" fill="#c96e42" opacity="0.6" />
          <circle cx="92" cy="68" r="1.5" fill="#c96e42" opacity="0.6" />
          <circle cx="104" cy="68" r="1.5" fill="#c96e42" opacity="0.6" />

          {/* Outer scalloped ridge line — shell edge */}
          <path d="M38 82 Q42 76 48 82 Q54 88 60 82 Q66 76 72 82" fill="none" stroke="rgba(80,35,15,0.25)" strokeWidth="1" />
          <path d="M92 82 Q98 76 104 82 Q110 88 116 82 Q122 76 126 82" fill="none" stroke="rgba(80,35,15,0.25)" strokeWidth="1" />

          {/* Pattern glow overlay — pulses with mood */}
          <ellipse cx="82" cy="78" rx="20" ry="16" fill="url(#tt-pattern-glow)" opacity="0.4" />
        </g>

        {/* Shell rim highlight */}
        <path d="M40 90 Q62 48 82 46 Q102 48 124 90" fill="none" stroke="rgba(255,220,180,0.25)" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* === Front legs (in front of shell) === */}
      <g className="tokki-leg tokki-leg--front-left">
        <ellipse cx="46" cy="110" rx="10" ry="8" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.25)" strokeWidth="1.2" />
        <circle cx="39" cy="114" r="2.8" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="0.8" />
        <circle cx="43" cy="116" r="2.4" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="0.8" />
        <circle cx="47" cy="117" r="2.2" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="0.8" />
      </g>
      <g className="tokki-leg tokki-leg--front-right">
        <ellipse cx="118" cy="110" rx="10" ry="8" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.25)" strokeWidth="1.2" />
        <circle cx="125" cy="114" r="2.8" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="0.8" />
        <circle cx="121" cy="116" r="2.4" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="0.8" />
        <circle cx="117" cy="117" r="2.2" fill="url(#tt-leg)" stroke="rgba(20,40,15,0.2)" strokeWidth="0.8" />
      </g>

      {/* === Head — small, peeking out left side of shell === */}
      <g className="tokki-head">
        {/* Neck connecting to shell */}
        <ellipse cx="40" cy="82" rx="12" ry="9" fill="url(#tt-head)" stroke="rgba(20,40,15,0.2)" strokeWidth="1" />

        {/* Head shape — rounded, gentle */}
        <ellipse cx="28" cy="76" rx="16" ry="14" fill="url(#tt-head)" stroke="rgba(20,40,15,0.25)" strokeWidth="1.5" />

        {/* Forehead highlight */}
        <ellipse cx="25" cy="72" rx="8" ry="6" fill="#5a9a4e" opacity="0.35" />

        {/* Subtle wrinkle lines — wise old turtle */}
        <path d="M20 72 Q24 70 28 72" fill="none" stroke="rgba(20,40,15,0.15)" strokeWidth="0.7" strokeLinecap="round" />
        <path d="M22 75 Q26 73 30 75" fill="none" stroke="rgba(20,40,15,0.12)" strokeWidth="0.6" strokeLinecap="round" />

        {/* Eyes — small, dark, kind, warm */}
        <g className="tokki-eye tokki-eye--left">
          <ellipse cx="23" cy="76" rx="3" ry="3.2" fill="url(#tt-eye-warm)" />
          <ellipse cx="23" cy="76" rx="3" ry="3.2" fill="none" stroke="rgba(20,40,15,0.3)" strokeWidth="0.8" />
          {/* Warm highlight */}
          <ellipse cx="22" cy="74.8" rx="1.2" ry="1.3" fill="#fff" opacity="0.75" />
          <circle cx="24" cy="77" r="0.6" fill="#fff" opacity="0.4" />
        </g>
        <g className="tokki-eye tokki-eye--right">
          <ellipse cx="33" cy="76" rx="3" ry="3.2" fill="url(#tt-eye-warm)" />
          <ellipse cx="33" cy="76" rx="3" ry="3.2" fill="none" stroke="rgba(20,40,15,0.3)" strokeWidth="0.8" />
          <ellipse cx="32" cy="74.8" rx="1.2" ry="1.3" fill="#fff" opacity="0.75" />
          <circle cx="34" cy="77" r="0.6" fill="#fff" opacity="0.4" />
        </g>

        {/* Cheek blush */}
        <ellipse className="tokki-cheek tokki-cheek--left" cx="19" cy="80" rx="4" ry="2.5" fill="url(#tt-cheek)" />
        <ellipse className="tokki-cheek tokki-cheek--right" cx="37" cy="80" rx="4" ry="2.5" fill="url(#tt-cheek)" />

        {/* Tiny nose */}
        <ellipse cx="28" cy="81" rx="1.8" ry="1.2" fill="#24501e" opacity="0.7" />

        {/* Gentle smile — tiny and kind */}
        <path className="tokki-mouth" d="M24 84 Q26 86.5 28 86.5 Q30 86.5 32 84" fill="none" stroke="#24501e" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      </g>

      {/* === Zzz / snore elements === */}
      <circle className="tokki-snore tokki-snore--a" cx="12" cy="62" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="6" cy="52" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="14" y="59" fontSize="10" fontWeight="bold" fill="#5a7a54">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="8" y="46" fontSize="13" fontWeight="bold" fill="#5a7a54">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="2" y="32" fontSize="16" fontWeight="bold" fill="#5a7a54">Z</text>
    </svg>
  );
}

registerAvatar({
  id: "turtle_v1",
  label: "Turtle",
  emoji: "\u{1F422}",
  cssClass: "tokki-asset--turtle",
  Component: TurtleV1Asset,
  fx: {},
});
