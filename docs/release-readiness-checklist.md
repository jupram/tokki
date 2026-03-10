> [Docs home](README.md) / Release readiness
>
> Use this checklist alongside the release automation and manifest tooling documented in this repository.

# Tokki release-readiness checklist

Use this checklist before cutting or publishing a `v*` release tag.

## 1) Local preflight (required)

- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run test:unit`
- [ ] `cargo test --manifest-path src-tauri\Cargo.toml`
- [ ] `npm run build`
- [ ] `npm run test:e2e`

## 2) Packaging and reliability validation (required)

- [ ] `npm run build:windows-release`
- [ ] `npm run validate:windows-release`
- [ ] `npm run validate:windows-update-reliability`
- [ ] `npm run release:manifest`

## 3) Platform-specific packaging checks

- [ ] Windows artifact exists in `dist\release\windows\` as:
  - [ ] `tokki_<version>_<architecture>.zip`
  - [ ] `tokki_<version>_<architecture>.sha256`
- [ ] On macOS runners, validate:
  - [ ] `npm run package:macos-release`
  - [ ] `npm run validate:macos-release`
  - [ ] Artifact pair in `dist\release\macos\` (`.dmg` + `.sha256`)

## 4) Workflow alignment checks

- [ ] CI workflow passes: `\.github\workflows\ci.yml`
  - typecheck, unit tests, perf budget, e2e, Rust tests
- [ ] Release artifact validation workflow passes: `\.github\workflows\windows-release-artifact.yml`
  - packaging + artifact validation + manifest generation
- [ ] Draft release workflow passes for tag pushes: `\.github\workflows\release-draft.yml`

## 5) Release manifest checks

- [ ] Generated manifest exists:
  - local: `dist\release\tokki-release-manifest.json`
  - CI: `dist\release\ci-artifacts\tokki-release-manifest.json`
  - draft workflow: `dist\release\draft-artifacts\tokki-release-manifest.json`
- [ ] Manifest artifact list and checksums match packaged files
- [ ] Required platform parity is present when cross-platform release is expected
- [ ] Signature readiness matches `TOKKI_REQUIRE_SIGNATURES` policy

## 6) Installer/update behavior confidence

- [ ] Update validation confirms checksum-gated install/update
- [ ] Update validation confirms atomic swap + rollback on launch failure
- [ ] Update validation confirms user data outside `app\` is preserved
- [ ] No stale `app.staging.*` / `app.previous` folders remain after successful validation
