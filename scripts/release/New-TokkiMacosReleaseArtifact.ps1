<#
.SYNOPSIS
Creates the portable Tokki macOS release artifact consumed by release automation.
#>
[CmdletBinding()]
param(
    [string]$RepositoryRoot,
    [string]$BundleRoot,
    [string]$OutputDirectory,
    [string]$TauriConfigPath,
    [string]$PackageJsonPath,
    [ValidateSet('x64', 'arm64', 'neutral')]
    [string]$Architecture,
    [string]$Version
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Convert-TokkiRelativePathToNative {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $Path
    }

    return [System.IO.Path]::Combine(($Path -split '[\\/]+'))
}

function Resolve-TokkiPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$BasePath
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    $nativeRelativePath = Convert-TokkiRelativePathToNative -Path $Path
    return [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($BasePath, $nativeRelativePath))
}

function Get-TokkiDefaultArchitecture {
    try {
        switch ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture) {
            'X64' { return 'x64' }
            'Arm64' { return 'arm64' }
            default { return 'neutral' }
        }
    }
    catch {
        switch ($env:PROCESSOR_ARCHITECTURE) {
            'AMD64' { return 'x64' }
            'ARM64' { return 'arm64' }
            default { return 'neutral' }
        }
    }
}

function Format-TokkiTemplate {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Template,
        [Parameter(Mandatory = $true)]
        [string]$Version,
        [Parameter(Mandatory = $true)]
        [string]$Architecture
    )

    return $Template.Replace('{version}', $Version).Replace('{architecture}', $Architecture)
}

function Get-TokkiFileSha256 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $stream = [System.IO.File]::OpenRead($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hashBytes = $algorithm.ComputeHash($stream)
    }
    finally {
        $algorithm.Dispose()
        $stream.Dispose()
    }

    return ([System.BitConverter]::ToString($hashBytes) -replace '-', '').ToLowerInvariant()
}

function Get-TokkiPackageVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ResolvedPackageJsonPath,
        [Parameter(Mandatory = $true)]
        [string]$ResolvedTauriConfigPath,
        [Parameter(Mandatory = $true)]
        [string]$ResolvedRepositoryRoot,
        [string]$RequestedVersion
    )

    if (-not (Test-Path -LiteralPath $ResolvedPackageJsonPath -PathType Leaf)) {
        throw "package.json not found: $ResolvedPackageJsonPath"
    }

    if (-not (Test-Path -LiteralPath $ResolvedTauriConfigPath -PathType Leaf)) {
        throw "Tauri config not found: $ResolvedTauriConfigPath"
    }

    try {
        $packageJson = Get-Content -LiteralPath $ResolvedPackageJsonPath -Raw | ConvertFrom-Json
    }
    catch {
        throw "Failed to read package metadata from $ResolvedPackageJsonPath. $($_.Exception.Message)"
    }

    try {
        $tauriConfig = Get-Content -LiteralPath $ResolvedTauriConfigPath -Raw | ConvertFrom-Json
    }
    catch {
        throw "Failed to read Tauri config from $ResolvedTauriConfigPath. $($_.Exception.Message)"
    }

    $packageVersion = [string]$packageJson.version
    $tauriVersion = [string]$tauriConfig.version
    $resolvedVersion = if (-not [string]::IsNullOrWhiteSpace($RequestedVersion)) {
        $RequestedVersion.TrimStart('v')
    }
    else {
        $tauriVersion
    }

    if ([string]::IsNullOrWhiteSpace($resolvedVersion)) {
        throw 'Could not determine the release version.'
    }

    $versionSources = [ordered]@{
        'package.json' = $packageVersion
        'src-tauri\tauri.conf.json' = $tauriVersion
    }

    $cargoTomlPath = Resolve-TokkiPath -Path 'src-tauri\Cargo.toml' -BasePath $ResolvedRepositoryRoot
    if (Test-Path -LiteralPath $cargoTomlPath -PathType Leaf) {
        $inPackageSection = $false
        $cargoVersion = $null
        foreach ($line in (Get-Content -LiteralPath $cargoTomlPath)) {
            if ($line -match '^\s*\[package\]\s*$') {
                $inPackageSection = $true
                continue
            }

            if ($inPackageSection -and $line -match '^\s*\[') {
                break
            }

            if ($inPackageSection -and $line -match '^\s*version\s*=\s*"([^"]+)"') {
                $cargoVersion = $Matches[1]
                break
            }
        }

        if (-not [string]::IsNullOrWhiteSpace($cargoVersion)) {
            $versionSources['src-tauri\Cargo.toml'] = $cargoVersion
        }
    }

    $mismatches = @()
    foreach ($entry in $versionSources.GetEnumerator()) {
        if ([string]::IsNullOrWhiteSpace($entry.Value) -or $entry.Value -ne $resolvedVersion) {
            $mismatches += '{0}={1}' -f $entry.Key, $entry.Value
        }
    }

    if ($mismatches.Count -gt 0) {
        throw "Release version mismatch. Expected $resolvedVersion, found: $($mismatches -join ', ')"
    }

    return $resolvedVersion
}

function Test-TokkiArchitectureMatch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FileName,
        [Parameter(Mandatory = $true)]
        [string]$Architecture
    )

    switch ($Architecture) {
        'x64' { return $FileName -match '(?i)(x64|amd64|x86_64)' }
        'arm64' { return $FileName -match '(?i)(arm64|aarch64)' }
        'neutral' { return $FileName -match '(?i)(neutral|universal)' }
        default { return $false }
    }
}

function Format-TokkiMacArtifactCandidates {
    param(
        [Parameter(Mandatory = $true)]
        $Candidates
    )

    $displayCandidates = @($Candidates | Select-Object -First 8 | ForEach-Object {
            '{0} [versionMatch={1}; architectureMatch={2}]' -f $_.Name, ([string]$_.MatchesVersion).ToLowerInvariant(), ([string]$_.MatchesArchitecture).ToLowerInvariant()
        })

    if ($displayCandidates.Count -eq 0) {
        return 'none'
    }

    return ($displayCandidates -join '; ')
}

function Resolve-TokkiMacArtifactSource {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SearchRoot,
        [Parameter(Mandatory = $true)]
        [string]$Version,
        [Parameter(Mandatory = $true)]
        [string]$Architecture
    )

    if (-not (Test-Path -LiteralPath $SearchRoot -PathType Container)) {
        throw "Build output root not found: $SearchRoot"
    }

    $dmgRoot = Join-Path -Path $SearchRoot -ChildPath 'dmg'
    $searchDirectory = if (Test-Path -LiteralPath $dmgRoot -PathType Container) { $dmgRoot } else { $SearchRoot }
    $candidates = @(Get-ChildItem -LiteralPath $searchDirectory -Filter '*.dmg' -File -Recurse -ErrorAction SilentlyContinue)
    if ($candidates.Count -eq 0) {
        throw "Could not find a macOS .dmg artifact under $searchDirectory. Run npm run tauri build before packaging."
    }

    $normalizedVersionPattern = [Regex]::Escape($Version.ToLowerInvariant())
    $scoredCandidates = @(
        $candidates |
            ForEach-Object {
                $fileName = $_.Name.ToLowerInvariant()
                $matchesVersion = $fileName -match $normalizedVersionPattern
                $matchesArchitecture = Test-TokkiArchitectureMatch -FileName $fileName -Architecture $Architecture
                $versionScore = if ($matchesVersion) { 2 } else { 0 }
                $architectureScore = if ($matchesArchitecture) { 2 } else { 0 }
                [pscustomobject]@{
                    Path = $_.FullName
                    Name = $_.Name
                    LastWriteTimeUtc = $_.LastWriteTimeUtc
                    MatchesVersion = $matchesVersion
                    MatchesArchitecture = $matchesArchitecture
                    Score = $versionScore + $architectureScore
                }
            } |
            Sort-Object -Property @{ Expression = 'Score'; Descending = $true }, @{ Expression = 'LastWriteTimeUtc'; Descending = $true }, @{ Expression = 'Name'; Descending = $false }
    )

    $matchingCandidates = @($scoredCandidates | Where-Object { $_.MatchesVersion -and $_.MatchesArchitecture })
    if ($matchingCandidates.Count -eq 0) {
        $candidateSummary = Format-TokkiMacArtifactCandidates -Candidates $scoredCandidates
        throw "Could not find a macOS .dmg artifact matching version '$Version' and architecture '$Architecture' under $searchDirectory. Available candidates: $candidateSummary"
    }

    if ($matchingCandidates.Count -gt 1) {
        Write-Verbose "Multiple matching macOS .dmg artifacts found under $searchDirectory. Selecting newest candidate '$($matchingCandidates[0].Name)'."
    }

    return $matchingCandidates[0].Path
}

$scriptRoot = if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    $PSScriptRoot
}
elseif (-not [string]::IsNullOrWhiteSpace($PSCommandPath)) {
    Split-Path -Path $PSCommandPath -Parent
}
else {
    (Get-Location).Path
}

$repositoryRootInput = if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) { '..\..' } else { $RepositoryRoot }
$tauriConfigPathInput = if ([string]::IsNullOrWhiteSpace($TauriConfigPath)) { 'src-tauri\tauri.conf.json' } else { $TauriConfigPath }
$packageJsonPathInput = if ([string]::IsNullOrWhiteSpace($PackageJsonPath)) { 'package.json' } else { $PackageJsonPath }
$bundleRootInput = if ([string]::IsNullOrWhiteSpace($BundleRoot)) { 'src-tauri\target\release\bundle' } else { $BundleRoot }
$outputDirectoryInput = if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { 'dist\release\macos' } else { $OutputDirectory }

$resolvedRepositoryRoot = Resolve-TokkiPath -Path $repositoryRootInput -BasePath $scriptRoot
$resolvedTauriConfigPath = Resolve-TokkiPath -Path $tauriConfigPathInput -BasePath $resolvedRepositoryRoot
$resolvedPackageJsonPath = Resolve-TokkiPath -Path $packageJsonPathInput -BasePath $resolvedRepositoryRoot
$resolvedBundleRoot = Resolve-TokkiPath -Path $bundleRootInput -BasePath $resolvedRepositoryRoot
$resolvedOutputDirectory = Resolve-TokkiPath -Path $outputDirectoryInput -BasePath $resolvedRepositoryRoot
$resolvedArchitecture = if ([string]::IsNullOrWhiteSpace($Architecture)) { Get-TokkiDefaultArchitecture } else { $Architecture }
$resolvedVersion = Get-TokkiPackageVersion -ResolvedPackageJsonPath $resolvedPackageJsonPath -ResolvedTauriConfigPath $resolvedTauriConfigPath -ResolvedRepositoryRoot $resolvedRepositoryRoot -RequestedVersion $Version

$artifactNameTemplate = 'tokki_{version}_{architecture}.dmg'
$workflowArtifactNameTemplate = 'tokki-macos-release-{architecture}'
$artifactName = Format-TokkiTemplate -Template $artifactNameTemplate -Version $resolvedVersion -Architecture $resolvedArchitecture
$workflowArtifactName = Format-TokkiTemplate -Template $workflowArtifactNameTemplate -Version $resolvedVersion -Architecture $resolvedArchitecture
$artifactPath = Join-Path -Path $resolvedOutputDirectory -ChildPath $artifactName
$checksumPath = Join-Path -Path $resolvedOutputDirectory -ChildPath ('{0}.sha256' -f [System.IO.Path]::GetFileNameWithoutExtension($artifactName))
$sourceArtifactPath = Resolve-TokkiMacArtifactSource -SearchRoot $resolvedBundleRoot -Version $resolvedVersion -Architecture $resolvedArchitecture
$operationSucceeded = $false
$artifactCreated = $false
$checksumCreated = $false

try {
    New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null
    if (Test-Path -LiteralPath $artifactPath -PathType Leaf) {
        Remove-Item -LiteralPath $artifactPath -Force
    }

    if (Test-Path -LiteralPath $checksumPath -PathType Leaf) {
        Remove-Item -LiteralPath $checksumPath -Force
    }

    Copy-Item -LiteralPath $sourceArtifactPath -Destination $artifactPath -Force
    $artifactCreated = $true

    $hash = Get-TokkiFileSha256 -Path $artifactPath
    Set-Content -LiteralPath $checksumPath -Value ('{0} *{1}' -f $hash, (Split-Path -Path $artifactPath -Leaf)) -Encoding Ascii -NoNewline
    $checksumCreated = $true
    $operationSucceeded = $true
}
finally {
    if (-not $operationSucceeded) {
        if ($artifactCreated -and (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
            Remove-Item -LiteralPath $artifactPath -Force -ErrorAction SilentlyContinue
        }

        if ($checksumCreated -and (Test-Path -LiteralPath $checksumPath -PathType Leaf)) {
            Remove-Item -LiteralPath $checksumPath -Force -ErrorAction SilentlyContinue
        }
    }
}

[pscustomobject]@{
    ArtifactName = $artifactName
    ArtifactPath = $artifactPath
    ChecksumPath = $checksumPath
    WorkflowArtifactName = $workflowArtifactName
    Version = $resolvedVersion
    Architecture = $resolvedArchitecture
    SourceArtifactPath = $sourceArtifactPath
    OutputDirectory = $resolvedOutputDirectory
}
