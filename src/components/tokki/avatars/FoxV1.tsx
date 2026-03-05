import { registerAvatar } from "./index";

function FoxV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--fox"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="fx-body" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#f5a050" />
          <stop offset="100%" stopColor="#e07828" />
        </radialGradient>
        <radialGradient id="fx-belly" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fff8f0" />
          <stop offset="100%" stopColor="#ffe8d0" />
        </radialGradient>
        <radialGradient id="fx-ear-inner" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#3a2218" />
          <stop offset="100%" stopColor="#2a1610" />
        </radialGradient>
        <radialGradient id="fx-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcbb8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ff9e8a" stopOpacity="0.25" />
        </radialGradient>
        <radialGradient id="fx-face" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#fffef8" />
          <stop offset="70%" stopColor="#fff4e4" />
          <stop offset="100%" stopColor="#ffe8cc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fx-paw" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#3a2818" />
          <stop offset="100%" stopColor="#2a1c12" />
        </radialGradient>
        <linearGradient id="fx-tail-grad" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#e07828" />
          <stop offset="80%" stopColor="#cc6020" />
          <stop offset="100%" stopColor="#fff8f0" />
        </linearGradient>
      </defs>

      <ellipse className="tokki-shadow" cx="80" cy="138" rx="38" ry="8" />
      <ellipse className="tokki-body" cx="80" cy="108" rx="27" ry="22" fill="url(#fx-body)" stroke="rgba(58,30,18,0.18)" strokeWidth="1.5" />
      <ellipse cx="80" cy="112" rx="16" ry="14" fill="url(#fx-belly)" opacity="0.85" />

      <g className="tokki-ear tokki-ear--left">
        <polygon className="tokki-ear-shell" points="50,52 28,8 72,38" fill="url(#fx-body)" stroke="rgba(58,30,18,0.2)" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon className="tokki-ear-inner" points="50,46 36,18 64,38" fill="url(#fx-ear-inner)" />
        <ellipse cx="50" cy="48" rx="4" ry="3" fill="#fff4e4" opacity="0.5" />
      </g>
      <g className="tokki-ear tokki-ear--right">
        <polygon className="tokki-ear-shell" points="110,52 132,8 88,38" fill="url(#fx-body)" stroke="rgba(58,30,18,0.2)" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon className="tokki-ear-inner" points="110,46 124,18 96,38" fill="url(#fx-ear-inner)" />
        <ellipse cx="110" cy="48" rx="4" ry="3" fill="#fff4e4" opacity="0.5" />
      </g>

      <ellipse className="tokki-head" cx="80" cy="74" rx="37" ry="35" fill="url(#fx-body)" stroke="rgba(58,30,18,0.2)" strokeWidth="1.8" />

      <path
        className="tokki-face-mask"
        d="M58 64 Q60 56 80 52 Q100 56 102 64 L102 78 Q100 96 80 98 Q60 96 58 78 Z"
        fill="url(#fx-face)"
        opacity="0.9"
      />

      <g className="tokki-eye tokki-eye--left">
        <ellipse cx="66" cy="70" rx="5.5" ry="5" fill="#d09018" />
        <ellipse cx="66" cy="70" rx="5.5" ry="5" fill="none" stroke="rgba(58,30,18,0.3)" strokeWidth="1" />
        <ellipse cx="66" cy="70" rx="2" ry="4.5" fill="#181210" />
        <ellipse cx="64.8" cy="68.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.8" />
        <ellipse cx="67" cy="71.5" rx="0.8" ry="0.8" fill="#fff" opacity="0.45" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="94" cy="70" rx="5.5" ry="5" fill="#d09018" />
        <ellipse cx="94" cy="70" rx="5.5" ry="5" fill="none" stroke="rgba(58,30,18,0.3)" strokeWidth="1" />
        <ellipse cx="94" cy="70" rx="2" ry="4.5" fill="#181210" />
        <ellipse cx="92.8" cy="68.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.8" />
        <ellipse cx="95" cy="71.5" rx="0.8" ry="0.8" fill="#fff" opacity="0.45" />
      </g>

      <path d="M59 62 Q66 58 73 62" fill="none" stroke="rgba(58,30,18,0.18)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M87 62 Q94 58 101 62" fill="none" stroke="rgba(58,30,18,0.18)" strokeWidth="1.2" strokeLinecap="round" />

      <ellipse className="tokki-cheek tokki-cheek--left" cx="55" cy="80" rx="6" ry="3.5" fill="url(#fx-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="105" cy="80" rx="6" ry="3.5" fill="url(#fx-cheek)" />

      <ellipse className="tokki-nose" cx="80" cy="80" rx="4" ry="3" fill="#2a1810" />
      <ellipse cx="79" cy="79" rx="1.2" ry="0.8" fill="#4a3828" opacity="0.6" />

      <path className="tokki-mouth" d="M75 85 Q78 89 80 88 Q82 89 85 85" fill="none" stroke="#5a3018" strokeWidth="1.8" strokeLinecap="round" />

      <circle className="tokki-snore tokki-snore--a" cx="118" cy="64" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="125" cy="55" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="120" y="61" fontSize="10" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="127" y="49" fontSize="13" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="134" y="36" fontSize="16" fontWeight="bold" fill="#8b7e74">Z</text>

      <ellipse className="tokki-paw tokki-paw--left" cx="64" cy="108" rx="10" ry="8" fill="url(#fx-paw)" stroke="rgba(58,30,18,0.2)" strokeWidth="1.2" />
      <ellipse className="tokki-paw tokki-paw--right" cx="96" cy="108" rx="10" ry="8" fill="url(#fx-paw)" stroke="rgba(58,30,18,0.2)" strokeWidth="1.2" />

      <ellipse cx="68" cy="128" rx="10" ry="5.5" fill="url(#fx-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.2" />
      <ellipse cx="92" cy="128" rx="10" ry="5.5" fill="url(#fx-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.2" />

      <path
        className="tokki-tail"
        d="M106 114 Q132 98 130 72 Q128 56 138 44"
        fill="none"
        stroke="url(#fx-body)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M106 114 Q132 98 130 72 Q128 56 138 44"
        fill="none"
        stroke="rgba(58,30,18,0.12)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle className="tokki-tail-tip" cx="138" cy="44" r="7" fill="#fffef8" stroke="rgba(58,30,18,0.1)" strokeWidth="1" />
      <circle cx="138" cy="44" r="4" fill="#fff" opacity="0.5" />
    </svg>
  );
}

registerAvatar({
  id: "fox_v1",
  label: "Fox",
  emoji: "\u{1F98A}",
  cssClass: "tokki-asset--fox",
  Component: FoxV1Asset,
  fx: {},
});
