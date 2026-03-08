import { memo } from "react";
import type { TokkiAssetId } from "../../animation/mapActionToView";

interface TokkiAvatarAssetProps {
  assetId: TokkiAssetId;
}

function RabbitAsset(): JSX.Element {
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

      {/* Ground shadow */}
      <ellipse className="tokki-shadow" cx="80" cy="138" rx="34" ry="7" />

      {/* Body / torso blob */}
      <ellipse className="tokki-body" cx="80" cy="108" rx="28" ry="22" fill="url(#rb-body)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.5" />

      {/* Ears */}
      <g className="tokki-ear tokki-ear--left" filter="url(#rb-soft-shadow)">
        <ellipse className="tokki-ear-shell" cx="56" cy="36" rx="14" ry="32" fill="url(#rb-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" />
        <ellipse className="tokki-ear-inner" cx="56" cy="36" rx="7" ry="20" fill="url(#rb-ear-inner)" />
      </g>
      <g className="tokki-ear tokki-ear--right" filter="url(#rb-soft-shadow)">
        <ellipse className="tokki-ear-shell" cx="104" cy="36" rx="14" ry="32" fill="url(#rb-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" />
        <ellipse className="tokki-ear-inner" cx="104" cy="36" rx="7" ry="20" fill="url(#rb-ear-inner)" />
      </g>

      {/* Head */}
      <circle className="tokki-head" cx="80" cy="74" r="38" fill="url(#rb-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" />

      {/* Inner-ear tufts */}
      <ellipse cx="56" cy="52" rx="3" ry="5" fill="#fff8f0" opacity="0.5" />
      <ellipse cx="104" cy="52" rx="3" ry="5" fill="#fff8f0" opacity="0.5" />

      {/* Eyes */}
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

      {/* Eyebrows - subtle arches */}
      <path d="M62 64 Q67 61 72 63" fill="none" stroke="#5a3c2e" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
      <path d="M88 63 Q93 61 98 64" fill="none" stroke="#5a3c2e" strokeWidth="1" opacity="0.25" strokeLinecap="round" />

      {/* Cheeks */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="57" cy="82" rx="8" ry="5" fill="url(#rb-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="103" cy="82" rx="8" ry="5" fill="url(#rb-cheek)" />

      {/* Nose */}
      <ellipse cx="80" cy="79" rx="3.5" ry="2.5" fill="#e8a0a0" />

      {/* Mouth */}
      <path className="tokki-mouth" d="M73 84 Q77 89 80 89 Q83 89 87 84" fill="none" stroke="#5a3018" strokeWidth="2" strokeLinecap="round" />

      {/* Tiny front teeth */}
      <rect x="77.5" y="84" width="2.2" height="3" rx="1" fill="#fff" stroke="rgba(58,30,18,0.15)" strokeWidth="0.6" />
      <rect x="80.3" y="84" width="2.2" height="3" rx="1" fill="#fff" stroke="rgba(58,30,18,0.15)" strokeWidth="0.6" />

      {/* Zzz / snore elements */}
      <circle className="tokki-snore tokki-snore--a" cx="116" cy="66" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="123" cy="57" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="118" y="63" fontSize="10" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="126" y="51" fontSize="13" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="132" y="38" fontSize="16" fontWeight="bold" fill="#8b7e74">Z</text>

      {/* Paws resting on body */}
      <ellipse className="tokki-paw tokki-paw--left" cx="64" cy="106" rx="11" ry="9" fill="url(#rb-paw)" stroke="rgba(58,30,18,0.18)" strokeWidth="1.4" />
      <ellipse className="tokki-paw tokki-paw--right" cx="96" cy="106" rx="11" ry="9" fill="url(#rb-paw)" stroke="rgba(58,30,18,0.18)" strokeWidth="1.4" />

      {/* Paw pad details */}
      <circle cx="62" cy="108" r="2.2" fill="#ffc5b4" opacity="0.45" />
      <circle cx="66" cy="108" r="2.2" fill="#ffc5b4" opacity="0.45" />
      <circle cx="94" cy="108" r="2.2" fill="#ffc5b4" opacity="0.45" />
      <circle cx="98" cy="108" r="2.2" fill="#ffc5b4" opacity="0.45" />

      {/* Feet */}
      <ellipse cx="68" cy="128" rx="11" ry="6" fill="url(#rb-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.2" />
      <ellipse cx="92" cy="128" rx="11" ry="6" fill="url(#rb-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.2" />

      {/* Fluffy tail puff */}
      <circle className="tokki-tail" cx="108" cy="118" r="8" fill="url(#rb-body)" stroke="rgba(58,30,18,0.14)" strokeWidth="1.2" />
    </svg>
  );
}

function CatAsset(): JSX.Element {
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

      {/* Ground shadow */}
      <ellipse className="tokki-shadow" cx="80" cy="138" rx="36" ry="7" />

      {/* Body */}
      <ellipse className="tokki-body" cx="80" cy="108" rx="26" ry="22" fill="url(#ct-body)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.5" />
      {/* Belly patch */}
      <ellipse cx="80" cy="112" rx="14" ry="12" fill="url(#ct-belly)" opacity="0.7" />

      {/* Pointy ears */}
      <g className="tokki-ear tokki-ear--left">
        <polygon className="tokki-ear-shell" points="48,56 32,16 68,44" fill="url(#ct-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon className="tokki-ear-inner" points="48,50 38,26 60,44" fill="url(#ct-ear-inner)" />
      </g>
      <g className="tokki-ear tokki-ear--right">
        <polygon className="tokki-ear-shell" points="112,56 128,16 92,44" fill="url(#ct-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon className="tokki-ear-inner" points="112,50 122,26 100,44" fill="url(#ct-ear-inner)" />
      </g>

      {/* Head */}
      <circle className="tokki-head" cx="80" cy="74" r="37" fill="url(#ct-body)" stroke="rgba(58,30,18,0.22)" strokeWidth="1.8" />

      {/* Tabby stripes on forehead */}
      <path d="M72 56 Q80 52 88 56" fill="none" stroke="url(#ct-stripe)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M68 60 Q80 55 92 60" fill="none" stroke="url(#ct-stripe)" strokeWidth="2" strokeLinecap="round" />
      <path d="M74 52 L80 48 L86 52" fill="none" stroke="url(#ct-stripe)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* Eyes — almond-shaped with slit pupils */}
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

      {/* Whiskers */}
      <g className="tokki-whisker" opacity="0.35" stroke="#5a3c2e" strokeWidth="1" fill="none" strokeLinecap="round">
        <line x1="40" y1="78" x2="56" y2="80" />
        <line x1="38" y1="84" x2="55" y2="84" />
        <line x1="42" y1="90" x2="56" y2="87" />
        <line x1="104" y1="80" x2="120" y2="78" />
        <line x1="105" y1="84" x2="122" y2="84" />
        <line x1="104" y1="87" x2="118" y2="90" />
      </g>

      {/* Cheeks */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="55" cy="82" rx="7" ry="4.5" fill="url(#ct-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="105" cy="82" rx="7" ry="4.5" fill="url(#ct-cheek)" />

      {/* Nose — small pink triangle */}
      <polygon className="tokki-nose" points="80,79 76.5,75 83.5,75" fill="#e0888a" stroke="rgba(58,30,18,0.15)" strokeWidth="0.8" strokeLinejoin="round" />

      {/* Mouth — W shape */}
      <path className="tokki-mouth" d="M74 83 Q77 87 80 83 Q83 87 86 83" fill="none" stroke="#5a3018" strokeWidth="1.8" strokeLinecap="round" />

      {/* Zzz / snore elements */}
      <circle className="tokki-snore tokki-snore--a" cx="116" cy="66" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="123" cy="57" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="118" y="63" fontSize="10" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="126" y="51" fontSize="13" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="132" y="38" fontSize="16" fontWeight="bold" fill="#8b7e74">Z</text>

      {/* Paws */}
      <ellipse className="tokki-paw tokki-paw--left" cx="64" cy="108" rx="11" ry="8" fill="url(#ct-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.4" />
      <ellipse className="tokki-paw tokki-paw--right" cx="96" cy="108" rx="11" ry="8" fill="url(#ct-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.4" />

      {/* Paw pads — bean toes */}
      <ellipse cx="62" cy="110" rx="2.5" ry="1.8" fill="#e0b0b8" opacity="0.5" />
      <ellipse cx="66" cy="110" rx="2.5" ry="1.8" fill="#e0b0b8" opacity="0.5" />
      <ellipse cx="64" cy="113" rx="3" ry="2" fill="#e0b0b8" opacity="0.4" />
      <ellipse cx="94" cy="110" rx="2.5" ry="1.8" fill="#e0b0b8" opacity="0.5" />
      <ellipse cx="98" cy="110" rx="2.5" ry="1.8" fill="#e0b0b8" opacity="0.5" />
      <ellipse cx="96" cy="113" rx="3" ry="2" fill="#e0b0b8" opacity="0.4" />

      {/* Feet */}
      <ellipse cx="68" cy="128" rx="10" ry="5.5" fill="url(#ct-paw)" stroke="rgba(58,30,18,0.14)" strokeWidth="1.2" />
      <ellipse cx="92" cy="128" rx="10" ry="5.5" fill="url(#ct-paw)" stroke="rgba(58,30,18,0.14)" strokeWidth="1.2" />

      {/* Tail — curvy with thick-to-thin stroke */}
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
      {/* Tail tip stripes */}
      <path d="M130 56 Q133 54 131 50" fill="none" stroke="url(#ct-stripe)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FoxAsset(): JSX.Element {
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

      {/* Ground shadow */}
      <ellipse className="tokki-shadow" cx="80" cy="138" rx="38" ry="8" />

      {/* Body */}
      <ellipse className="tokki-body" cx="80" cy="108" rx="27" ry="22" fill="url(#fx-body)" stroke="rgba(58,30,18,0.18)" strokeWidth="1.5" />
      {/* Belly */}
      <ellipse cx="80" cy="112" rx="16" ry="14" fill="url(#fx-belly)" opacity="0.85" />

      {/* Large pointed ears */}
      <g className="tokki-ear tokki-ear--left">
        <polygon className="tokki-ear-shell" points="50,52 28,8 72,38" fill="url(#fx-body)" stroke="rgba(58,30,18,0.2)" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon className="tokki-ear-inner" points="50,46 36,18 64,38" fill="url(#fx-ear-inner)" />
        {/* Ear tuft */}
        <ellipse cx="50" cy="48" rx="4" ry="3" fill="#fff4e4" opacity="0.5" />
      </g>
      <g className="tokki-ear tokki-ear--right">
        <polygon className="tokki-ear-shell" points="110,52 132,8 88,38" fill="url(#fx-body)" stroke="rgba(58,30,18,0.2)" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon className="tokki-ear-inner" points="110,46 124,18 96,38" fill="url(#fx-ear-inner)" />
        <ellipse cx="110" cy="48" rx="4" ry="3" fill="#fff4e4" opacity="0.5" />
      </g>

      {/* Head — slightly elongated */}
      <ellipse className="tokki-head" cx="80" cy="74" rx="37" ry="35" fill="url(#fx-body)" stroke="rgba(58,30,18,0.2)" strokeWidth="1.8" />

      {/* White face mask — V shape */}
      <path
        className="tokki-face-mask"
        d="M58 64 Q60 56 80 52 Q100 56 102 64 L102 78 Q100 96 80 98 Q60 96 58 78 Z"
        fill="url(#fx-face)"
        opacity="0.9"
      />

      {/* Eyes — sharp amber */}
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

      {/* Eyebrow accents */}
      <path d="M59 62 Q66 58 73 62" fill="none" stroke="rgba(58,30,18,0.18)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M87 62 Q94 58 101 62" fill="none" stroke="rgba(58,30,18,0.18)" strokeWidth="1.2" strokeLinecap="round" />

      {/* Cheeks */}
      <ellipse className="tokki-cheek tokki-cheek--left" cx="55" cy="80" rx="6" ry="3.5" fill="url(#fx-cheek)" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="105" cy="80" rx="6" ry="3.5" fill="url(#fx-cheek)" />

      {/* Nose — dark rounded triangle */}
      <ellipse className="tokki-nose" cx="80" cy="80" rx="4" ry="3" fill="#2a1810" />
      <ellipse cx="79" cy="79" rx="1.2" ry="0.8" fill="#4a3828" opacity="0.6" />

      {/* Mouth */}
      <path className="tokki-mouth" d="M75 85 Q78 89 80 88 Q82 89 85 85" fill="none" stroke="#5a3018" strokeWidth="1.8" strokeLinecap="round" />

      {/* Zzz / snore elements */}
      <circle className="tokki-snore tokki-snore--a" cx="118" cy="64" r="4.2" />
      <circle className="tokki-snore tokki-snore--b" cx="125" cy="55" r="2.8" />
      <text className="tokki-zzz tokki-zzz--a" x="120" y="61" fontSize="10" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--b" x="127" y="49" fontSize="13" fontWeight="bold" fill="#8b7e74">z</text>
      <text className="tokki-zzz tokki-zzz--c" x="134" y="36" fontSize="16" fontWeight="bold" fill="#8b7e74">Z</text>

      {/* Paws — dark socks */}
      <ellipse className="tokki-paw tokki-paw--left" cx="64" cy="108" rx="10" ry="8" fill="url(#fx-paw)" stroke="rgba(58,30,18,0.2)" strokeWidth="1.2" />
      <ellipse className="tokki-paw tokki-paw--right" cx="96" cy="108" rx="10" ry="8" fill="url(#fx-paw)" stroke="rgba(58,30,18,0.2)" strokeWidth="1.2" />

      {/* Feet — dark */}
      <ellipse cx="68" cy="128" rx="10" ry="5.5" fill="url(#fx-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.2" />
      <ellipse cx="92" cy="128" rx="10" ry="5.5" fill="url(#fx-paw)" stroke="rgba(58,30,18,0.16)" strokeWidth="1.2" />

      {/* Bushy tail */}
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
      {/* White tail tip */}
      <circle className="tokki-tail-tip" cx="138" cy="44" r="7" fill="#fffef8" stroke="rgba(58,30,18,0.1)" strokeWidth="1" />
      <circle cx="138" cy="44" r="4" fill="#fff" opacity="0.5" />
    </svg>
  );
}

export const TokkiAvatarAsset = memo(function TokkiAvatarAsset({
  assetId
}: TokkiAvatarAssetProps): JSX.Element {
  switch (assetId) {
    case "cat_v1":
      return <CatAsset />;
    case "fox_v1":
      return <FoxAsset />;
    case "rabbit_v1":
    default:
      return <RabbitAsset />;
  }
});