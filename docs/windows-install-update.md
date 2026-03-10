> [Docs home](README.md) / Windows install and update
>
> This is the current operational guide for Tokki's Windows install and update automation.

# Windows install and update automation

Tokki now has repo-local PowerShell automation under `scripts\windows\` for the roadmap install/update flow on Windows.

## What the scripts do

- Create and reuse `%LOCALAPPDATA%\Tokki`
- Install application files into `%LOCALAPPDATA%\Tokki\app`
- Keep user data in `%LOCALAPPDATA%\Tokki` outside the app payload
- Create Start Menu shortcuts under `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Tokki`
- Install a `tokki.cmd` wrapper in `%LOCALAPPDATA%\Tokki\bin`
- Add `%LOCALAPPDATA%\Tokki\bin` to the user `PATH` unless `-NoPathUpdate` is used
- Reconcile Start Menu shortcuts idempotently and verify expected shortcut targets
- Launch Tokki after install/update unless `-NoLaunch` is used (skips duplicate launch when already running)
- Retry GitHub metadata and asset downloads with exponential backoff on transient failures
- Verify release payload checksums (`.sha256`) before extraction/deploy
- Stage updates into an `app.staging.<guid>` directory, atomically rename into place, and keep `app.previous` for rollback until post-update validation succeeds
- Emit per-run installer diagnostics to `%LOCALAPPDATA%\Tokki\logs\installer-<mode>-<timestamp>.log` (non-`-WhatIf`)

Updates only replace `%LOCALAPPDATA%\Tokki\app` and refresh support files/shortcuts. They do **not** remove `%LOCALAPPDATA%\Tokki\memory.db` or other user-owned files in `%LOCALAPPDATA%\Tokki`.

## Release expectations

The installer/updater is intentionally built around a portable Windows `.zip` artifact produced from this repo's Tauri build output.

- Default repository: `jupram/tokki`
- Default release lookup: latest GitHub Release, or `-Tag vX.Y.Z`
- Preferred asset type: Windows `.zip`
- Concrete asset name: `tokki_<version>_<architecture>.zip`
- Local output directory: `dist\release\windows`
- Asset matching is defined in `scripts\windows\Tokki.Release.json`

The packaged artifact layout is:

```text
dist\release\windows\
  tokki_<version>_<architecture>.zip
  tokki_<version>_<architecture>.sha256
```

The installer treats the checksum sidecar as required for `.zip` artifacts. Missing or mismatched checksums fail the install/update before app files are touched.

The cross-platform release workflow now also stages macOS artifacts as:

```text
dist\release\macos\
  tokki_<version>_<architecture>.dmg
  tokki_<version>_<architecture>.sha256
```

A release manifest (`tokki-release-manifest.json`) is generated from the combined Windows/macOS artifact set to keep release parity and checksum verification reproducible.

The `.zip` contains a single top-level `tokki\` payload directory with `tokki.exe` and the rest of the runtime files that should be copied into `%LOCALAPPDATA%\Tokki\app`.

The `.msi` and `.exe` bundle outputs can still exist locally for other distribution paths, but these scripts and release automation use the portable `.zip` so updates can replace app files while leaving `%LOCALAPPDATA%\Tokki` data intact.

## Building the portable release artifact

```powershell
npm run build:windows-release
npm run validate:windows-release
npm run validate:windows-update-reliability
```

`npm run build:windows-release` runs `npm run tauri build` and then `scripts\windows\New-TokkiReleaseArtifact.ps1`, which repackages the Tauri bundle into the release asset shape above. `npm run validate:windows-release` checks the artifact name, checksum, and dry-runs both install and update flows against that packaged zip. `npm run validate:windows-update-reliability` runs an isolated end-to-end reliability harness that validates checksum-gated updates, atomic replacement, rollback on launch failure, and preservation of files in the install root outside `app\`.

## Local repo usage

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\Install-Tokki.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\Update-Tokki.ps1
```

Useful options:

```powershell
.\scripts\windows\Install-Tokki.ps1 -Tag v0.1.0
.\scripts\windows\Update-Tokki.ps1 -Tag v0.1.0 -NoLaunch
.\scripts\windows\Install-Tokki.ps1 -PackagePath .\dist\release\windows\tokki_<version>_x64.zip
.\scripts\windows\Tokki.ps1 status
```

Installer failures now include a clear terminal error plus the diagnostics log location when available.

## One-liner install

Because `scripts\windows\Tokki.ps1` can bootstrap its companion files from the repo, it can be used as a raw GitHub one-liner:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/jupram/tokki/main/scripts/windows/Tokki.ps1').Content)) install"
```

After installation, open a new terminal and run:

```powershell
tokki update
```

If the current shell has not picked up the updated `PATH` yet, use:

```powershell
%LOCALAPPDATA%\Tokki\bin\tokki.cmd update
```

## Offline/basic validation

These commands avoid real release downloads and are safe for local validation; most are dry runs, and the reliability harness runs isolated updates under `%TEMP%`:

```powershell
.\scripts\windows\New-TokkiReleaseArtifact.ps1
.\scripts\windows\Test-TokkiReleaseArtifact.ps1
.\scripts\windows\Install-Tokki.ps1 -WhatIf -NoLaunch
.\scripts\windows\Update-Tokki.ps1 -WhatIf -NoLaunch
.\scripts\windows\Install-Tokki.ps1 -PackagePath .\dist\release\windows\tokki_<version>_x64.zip -WhatIf -NoLaunch
.\scripts\windows\Update-Tokki.ps1 -PackagePath .\dist\release\windows\tokki_<version>_x64.zip -WhatIf -NoLaunch
.\scripts\windows\Test-TokkiUpdateReliability.ps1
.\scripts\windows\Tokki.ps1 status
```

`-WhatIf` keeps the workflow network-free for release lookup paths and does not create installer log files; it prints an explicit action plan instead.

## CI release pipeline

Two GitHub Actions workflows now mature release validation before publish:

- `Release Artifact Validation` (push to `main`, pull requests, manual dispatch)
  - Builds release artifacts on both `windows-latest` and `macos-latest`
  - Packages and validates Windows (`.zip` + `.sha256`) and macOS (`.dmg` + `.sha256`) artifacts
  - Runs Windows installer/update reliability validation (`Test-TokkiUpdateReliability.ps1`) in CI
  - Generates `dist\release\ci-artifacts\tokki-release-manifest.json` and validates checksum parity across supported platforms
- `Release Draft` (tag push `v*`)
  - Rebuilds the same Windows/macOS artifacts, verifies checksums, and enforces platform parity
  - Emits `tokki-release-manifest.json`
  - Uploads the artifacts, checksum sidecars, and manifest to the draft GitHub Release

Signature enforcement is readiness-gated via repo/org variable `TOKKI_REQUIRE_SIGNATURES`:

- `false` (default): checksum + parity validation required; missing signatures are reported in the manifest
- `true`: each artifact must include a detached sidecar signature (`.sig`, `.minisig`, or `.asc`) or the workflow fails

## Release-readiness checklist

For final launch or version-tag release sign-off, use:

- `docs\release-readiness-checklist.md`

That checklist is aligned to the current scripts and workflows in this repo (`ci.yml`, `windows-release-artifact.yml`, and `release-draft.yml`), including manifest verification and update-reliability validation.
