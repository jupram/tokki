import { registerAvatar } from "./registry";

function CatV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--cat"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="ct-body" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#e8e4e0" />
          <stop offset="100%" stopColor="#c9c0b8" />
        </radialGradient>
        <radialGradient id="ct-belly" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#f5f2ef" />
          <stop offset="100%" stopColor="#e8e2dc" />
        </radialGradient>
        <radialGradient id="ct-ear-inner" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#f2c8d0" />
          <stop offset="100%" stopColor="#e0a0b0" />
        </radialGradient>
        <radialGradient id="ct-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5c0b0" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#e89888" stopOpacity="0.25" />
        </radialGradient>
        <radialGradient id="ct-paw" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#f0ece8" />
          <stop offset="100%" stopColor="#ddd5cc" />
        </radialGradient>
        <linearGradient id="ct-stripe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b0a498" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#b0a498" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse className="tokki-shadow" cx="80" cy="138" rx="36" ry="7" />
      <ellipse className="tokki-body" cx="80" cy="108" rx="26" ry="22" fill="url(#ct-body)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.5" />
      <ellipse cx="80" cy="112" rx="14" ry="12" fill="url(#ct-belly)" opacity="0.7" />

      <g className="tokki-ear tokki-ear--left">
        <polygon className="tokki-ear-shell" points="48,56 32,16 68,44" fill="url(#ct-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon className="tokki-ear-inner" points="48,50 38,26 60,44" fill="url(#ct-ear-inner)" />
      </g>
      <g className="tokki-ear tokki-ear--right">
        <polygon className="tokki-ear-shell" points="112,56 128,16 92,44" fill="url(#ct-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon className="tokki-ear-inner" points="112,50 122,26 100,44" fill="url(#ct-ear-inner)" />
      </g>

      <circle className="tokki-head" cx="80" cy="74" r="37" fill="url(#ct-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" />

      <path d="M72 56 Q80 52 88 56" fill="none" stroke="url(#ct-stripe)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M68 60 Q80 55 92 60" fill="none" stroke="url(#ct-stripe)" strokeWidth="2" strokeLinecap="round" />
      <path d="M74 52 L80 48 L86 52" fill="none" stroke="url(#ct-stripe)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      <g className="tokki-eye tokki-eye--left">
        <ellipse cx="66" cy="72" rx="6" ry="5.5" fill="#f0e878" />
        <ellipse cx="66" cy="72" rx="6" ry="5.5" fill="none" stroke="rgba(58,30,18,0.3)" strokeWidth="1" />
        <ellipse cx="66" cy="72" rx="1.8" ry="5" fill="#181210" />
        <ellipse cx="65" cy="70.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.8" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="94" cy="72" rx="6" ry="5.5" fill="#f0e878" />
        <ellipse cx="94" cy="72" rx="6" ry="5.5" fill="none" stroke="rgba(58,30,18,0.3)" strokeWidth="1" />
        <ellipse cx="94" cy="72" rx="1.8" ry="5" fill="#181210" />
        <ellipse cx="93" cy="70.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.8" />
      </g>

      <g className="tokki-whisker" opacity="0.35" stroke="#5a3c2e" strokeWidth="1" fill="none" strokeLinecap="round">
        <line x1="40" y1="78" x2="56" y2="80" />
        <line x1="38" y1="84" x2="55" y2="84" />
        <line x1="42" y1="90" x2="56" y2="87" />
        <line x1="104" y1="80" x2="120" y2="78" />
        <line x1="105" y1="84" x2="122" y2="84" />
        <line x1="104" y1="87" x2="118" y2="90" />
      </g>

      <ellipse className="tokki-cheek tokki-cheek--left" cx="55" cy="82" rx="7" ry="4.5" fill="url(#ct-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="105" cy="82" rx="7" ry="4.5" fill="url(#ct-cheek)" />

      <polygon className="tokki-nose" points="80,79 76.5,75 83.5,75" fill="#e0888a" stroke="rgba(58,30,18,0.15)" strokeWidth="0.8" strokeLinejoin="round" />
      <path className="tokki-mouth" d="M74 83 Q77 87 80 83 Q83 87 86 83" fill="none" stroke="#5a3018" strokeWidth="1.8" strokeLinecap="round" />

      <circle className="tokki-snore tokki-snore--a" cx="116" cy="66" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="123" cy="57" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="118" y="63" fontSize="10" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="126" y="51" fontSize="13" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="132" y="38" fontSize="16" fontWeight="bold" fill="#8b7e74">Z</text>

      <ellipse className="tokki-paw tokki-paw--left" cx="64" cy="108" rx="11" ry="8" fill="url(#ct-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.4" />
      <ellipse className="tokki-paw tokki-paw--right" cx="96" cy="108" rx="11" ry="8" fill="url(#ct-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.4" />

      <ellipse cx="62" cy="110" rx="2.5" ry="1.8" fill="#e0b0b8" opacity="0.5" />
      <ellipse cx="66" cy="110" rx="2.5" ry="1.8" fill="#e0b0b8" opacity="0.5" />
      <ellipse cx="64" cy="113" rx="3" ry="2" fill="#e0b0b8" opacity="0.4" />
      <ellipse cx="94" cy="110" rx="2.5" ry="1.8" fill="#e0b0b8" opacity="0.5" />
      <ellipse cx="98" cy="110" rx="2.5" ry="1.8" fill="#e0b0b8" opacity="0.5" />
      <ellipse cx="96" cy="113" rx="3" ry="2" fill="#e0b0b8" opacity="0.4" />

      <ellipse cx="68" cy="128" rx="10" ry="5.5" fill="url(#ct-paw)" stroke="rgba(58,30,18,0.14)" strokeWidth="1.2" />
      <ellipse cx="92" cy="128" rx="10" ry="5.5" fill="url(#ct-paw)" stroke="rgba(58,30,18,0.14)" strokeWidth="1.2" />

      <path
        className="tokki-tail"
        d="M108 112 Q128 102 126 82 Q124 68 130 58 Q134 52 132 48"
        fill="none"
        stroke="url(#ct-body)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M108 112 Q128 102 126 82 Q124 68 130 58 Q134 52 132 48"
        fill="none"
        stroke="rgba(58,30,18,0.14)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M130 56 Q133 54 131 50" fill="none" stroke="url(#ct-stripe)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

registerAvatar({
  id: "cat_v1",
  label: "Cat",
  emoji: "\u{1F431}",
  cssClass: "tokki-asset--cat",
  Component: CatV1Asset,
  fx: {},
});
