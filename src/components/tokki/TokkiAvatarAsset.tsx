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
      <ellipse className="tokki-shadow" cx="80" cy="134" rx="36" ry="9" />
      <g className="tokki-ear tokki-ear--left">
        <ellipse className="tokki-ear-shell" cx="54" cy="44" rx="13" ry="30" />
        <ellipse className="tokki-ear-inner" cx="54" cy="44" rx="6" ry="18" />
      </g>
      <g className="tokki-ear tokki-ear--right">
        <ellipse className="tokki-ear-shell" cx="106" cy="44" rx="13" ry="30" />
        <ellipse className="tokki-ear-inner" cx="106" cy="44" rx="6" ry="18" />
      </g>
      <circle className="tokki-head" cx="80" cy="78" r="40" />
      <circle className="tokki-eye tokki-eye--left" cx="67" cy="74" r="4.8" />
      <circle className="tokki-eye tokki-eye--right" cx="93" cy="74" r="4.8" />
      <ellipse className="tokki-cheek tokki-cheek--left" cx="58" cy="87" rx="7" ry="4" />
      <ellipse className="tokki-cheek tokki-cheek--right" cx="102" cy="87" rx="7" ry="4" />
      <path className="tokki-mouth" d="M72 91 Q80 100 88 91" />
      <circle className="tokki-snore tokki-snore--a" cx="116" cy="71" r="5.2" />
      <circle className="tokki-snore tokki-snore--b" cx="124" cy="62" r="4.1" />
      <circle className="tokki-snore tokki-snore--c" cx="131" cy="54" r="3.1" />
      <circle className="tokki-paw tokki-paw--left" cx="66" cy="112" r="10.5" />
      <circle className="tokki-paw tokki-paw--right" cx="94" cy="112" r="10.5" />
    </svg>
  );
}

export function TokkiAvatarAsset({ assetId }: TokkiAvatarAssetProps): JSX.Element {
  if (assetId === "rabbit_v1") {
    return <RabbitAsset />;
  }

  return <RabbitAsset />;
}
