import { registerAvatar } from "./registry";

function RabbitV1Asset(): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className="tokki-asset tokki-asset--rabbit"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="rb-body" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#fff8ef" />
          <stop offset="100%" stopColor="#ffe8cc" />
        </radialGradient>
        <radialGradient id="rb-ear-inner" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#ffd6e0" />
          <stop offset="100%" stopColor="#ffadc0" />
        </radialGradient>
        <radialGradient id="rb-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcbb8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ff9e8a" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="rb-paw" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#fff0e0" />
          <stop offset="100%" stopColor="#ffd8b5" />
        </radialGradient>
        <filter id="rb-soft-shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dy="2" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feFlood floodColor="#5a3018" floodOpacity="0.08" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse className="tokki-shadow" cx="80" cy="138" rx="34" ry="7" />
      <ellipse className="tokki-body" cx="80" cy="108" rx="28" ry="22" fill="url(#rb-body)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.5" />

      <g className="tokki-ear tokki-ear--left" filter="url(#rb-soft-shadow)">
        <ellipse className="tokki-ear-shell" cx="56" cy="36" rx="14" ry="32" fill="url(#rb-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" />
        <ellipse className="tokki-ear-inner" cx="56" cy="36" rx="7" ry="20" fill="url(#rb-ear-inner)" />
      </g>
      <g className="tokki-ear tokki-ear--right" filter="url(#rb-soft-shadow)">
        <ellipse className="tokki-ear-shell" cx="104" cy="36" rx="14" ry="32" fill="url(#rb-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" />
        <ellipse className="tokki-ear-inner" cx="104" cy="36" rx="7" ry="20" fill="url(#rb-ear-inner)" />
      </g>

      <circle className="tokki-head" cx="80" cy="74" r="38" fill="url(#rb-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" />

      <ellipse cx="56" cy="52" rx="3" ry="5" fill="#fff8f0" opacity="0.5" />
      <ellipse cx="104" cy="52" rx="3" ry="5" fill="#fff8f0" opacity="0.5" />

      <g className="tokki-eye tokki-eye--left">
        <ellipse cx="67" cy="72" rx="5.5" ry="6" fill="#2a1810" />
        <ellipse cx="65.5" cy="70" rx="2.2" ry="2.5" fill="#fff" opacity="0.85" />
        <ellipse cx="68.5" cy="73.5" rx="1" ry="1" fill="#fff" opacity="0.5" />
      </g>
      <g className="tokki-eye tokki-eye--right">
        <ellipse cx="93" cy="72" rx="5.5" ry="6" fill="#2a1810" />
        <ellipse cx="91.5" cy="70" rx="2.2" ry="2.5" fill="#fff" opacity="0.85" />
        <ellipse cx="94.5" cy="73.5" rx="1" ry="1" fill="#fff" opacity="0.5" />
      </g>

      <path d="M62 64 Q67 61 72 63" fill="none" stroke="#5a3c2e" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
      <path d="M88 63 Q93 61 98 64" fill="none" stroke="#5a3c2e" strokeWidth="1" opacity="0.25" strokeLinecap="round" />

      <ellipse className="tokki-cheek tokki-cheek--left" cx="57" cy="82" rx="8" ry="5" fill="url(#rb-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="103" cy="82" rx="8" ry="5" fill="url(#rb-cheek)" />

      <ellipse cx="80" cy="79" rx="3.5" ry="2.5" fill="#e8a0a0" />
      <path className="tokki-mouth" d="M73 84 Q77 89 80 89 Q83 89 87 84" fill="none" stroke="#5a3018" strokeWidth="2" strokeLinecap="round" />

      <rect x="77.5" y="84" width="2.2" height="3" rx="1" fill="#fff" stroke="rgba(58,30,18,0.15)" strokeWidth="0.6" />
      <rect x="80.3" y="84" width="2.2" height="3" rx="1" fill="#fff" stroke="rgba(58,30,18,0.15)" strokeWidth="0.6" />

      <circle className="tokki-snore tokki-snore--a" cx="116" cy="66" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="123" cy="57" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="118" y="63" fontSize="10" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="126" y="51" fontSize="13" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="132" y="38" fontSize="16" fontWeight="bold" fill="#8b7e74">Z</text>

      <ellipse className="tokki-paw tokki-paw--left" cx="64" cy="106" rx="11" ry="9" fill="url(#rb-paw)" stroke="rgba(58,30,18,0.18)" strokeWidth="1.4" />
      <ellipse className="tokki-paw tokki-paw--right" cx="96" cy="106" rx="11" ry="9" fill="url(#rb-paw)" stroke="rgba(58,30,18,0.18)" strokeWidth="1.4" />

      <circle cx="62" cy="108" r="2.2" fill="#ffc5b4" opacity="0.45" />
      <circle cx="66" cy="108" r="2.2" fill="#ffc5b4" opacity="0.45" />
      <circle cx="94" cy="108" r="2.2" fill="#ffc5b4" opacity="0.45" />
      <circle cx="98" cy="108" r="2.2" fill="#ffc5b4" opacity="0.45" />

      <ellipse cx="68" cy="128" rx="11" ry="6" fill="url(#rb-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.2" />
      <ellipse cx="92" cy="128" rx="11" ry="6" fill="url(#rb-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.2" />

      <circle className="tokki-tail" cx="108" cy="118" r="8" fill="url(#rb-body)" stroke="rgba(58,30,18,0.14)" strokeWidth="1.2" />
    </svg>
  );
}

registerAvatar({
  id: "rabbit_v1",
  label: "Rabbit",
  emoji: "\u{1F430}",
  cssClass: "tokki-asset--rabbit",
  Component: RabbitV1Asset,
  fx: {},
});
