<#
.SYNOPSIS
Validates release artifacts, checksums, and signing readiness, then emits a release manifest.
#>
[CmdletBinding()]
param(
    [string]$RepositoryRoot,
    [string]$ReleaseRoot,
    [string]$ManifestPath,
    [switch]$RequireSignatures,
    [string[]]$RequiredPlatforms = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

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

    return [System.IO.Path]::GetFullPath((Join-Path -Path $BasePath -ChildPath $Path))
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

function Read-TokkiChecksumFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ChecksumPath,
        [string]$ExpectedAssetName
    )

    if (-not (Test-Path -LiteralPath $ChecksumPath -PathType Leaf)) {
        throw "Checksum file not found: $ChecksumPath"
    }

    $content = (Get-Content -LiteralPath $ChecksumPath -Raw -ErrorAction Stop).Trim()
    if ([string]::IsNullOrWhiteSpace($content)) {
        throw "Checksum file is empty: $ChecksumPath"
    }

    $parts = $content -split '\s+', 2
    $expectedHash = $parts[0].ToLowerInvariant()
    if ($expectedHash -notmatch '^[a-f0-9]{64}$') {
        throw "Checksum file $ChecksumPath does not start with a valid SHA256 hash."
    }

    if (-not [string]::IsNullOrWhiteSpace($ExpectedAssetName) -and $parts.Count -gt 1) {
        $declaredAssetName = $parts[1].Trim().TrimStart('*').Trim()
        if (
            -not [string]::IsNullOrWhiteSpace($declaredAssetName) -and
            -not [string]::Equals($declaredAssetName, $ExpectedAssetName, [System.StringComparison]::InvariantCultureIgnoreCase)
        ) {
            throw "Checksum file $ChecksumPath references '$declaredAssetName', expected '$ExpectedAssetName'."
        }
    }

    return $expectedHash
}

function Get-TokkiRelativePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath,
        [Parameter(Mandatory = $true)]
        [string]$TargetPath
    )

    $resolvedBasePath = [System.IO.Path]::GetFullPath($BasePath)
    $resolvedTargetPath = [System.IO.Path]::GetFullPath($TargetPath)
    if (-not $resolvedBasePath.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $resolvedBasePath = $resolvedBasePath + [System.IO.Path]::DirectorySeparatorChar
    }

    $baseUri = [System.Uri]$resolvedBasePath
    $targetUri = [System.Uri]$resolvedTargetPath
    $relativeUri = $baseUri.MakeRelativeUri($targetUri)
    return [System.Uri]::UnescapeDataString($relativeUri.ToString()).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
}

function Get-TokkiPlatformForArtifact {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath,
        [Parameter(Mandatory = $true)]
        [string]$Extension
    )

    if ($RelativePath -match '(?i)(^|[\\/])windows([\\/]|$)') {
        return 'windows'
    }

    if ($RelativePath -match '(?i)(^|[\\/])mac(os)?([\\/]|$)') {
        return 'macos'
    }

    switch ($Extension) {
        '.zip' { return 'windows' }
        '.dmg' { return 'macos' }
        default { return 'unknown' }
    }
}

function Get-TokkiArchitectureForArtifact {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FileName
    )

    if ($FileName -match '(?i)_(x64|arm64|neutral)\.[^.]+$') {
        return $Matches[1].ToLowerInvariant()
    }

    return 'unknown'
}

function Get-TokkiSignatureFiles {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ArtifactPath
    )

    $basePath = [System.IO.Path]::Combine((Split-Path -Path $ArtifactPath -Parent), [System.IO.Path]::GetFileNameWithoutExtension($ArtifactPath))
    $candidates = @(
        '{0}.sig' -f $basePath
        '{0}.minisig' -f $basePath
        '{0}.asc' -f $basePath
    )

    return @($candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
}

function Write-TokkiManifestFile {
    param(
        [Parameter(Mandatory = $true)]
        $Manifest,
        [Parameter(Mandatory = $true)]
        [string]$ManifestPath
    )

    $manifestDirectory = Split-Path -Path $ManifestPath -Parent
    if (-not (Test-Path -LiteralPath $manifestDirectory -PathType Container)) {
        New-Item -ItemType Directory -Path $manifestDirectory -Force | Out-Null
    }

    $temporaryManifestPath = Join-Path -Path $manifestDirectory -ChildPath ('{0}.{1}.tmp' -f (Split-Path -Path $ManifestPath -Leaf), [Guid]::NewGuid().ToString('N'))
    try {
        $manifestJson = $Manifest | ConvertTo-Json -Depth 10
        Set-Content -LiteralPath $temporaryManifestPath -Value $manifestJson -Encoding UTF8 -NoNewline
        $null = Get-Content -LiteralPath $temporaryManifestPath -Raw -ErrorAction Stop | ConvertFrom-Json

        if (Test-Path -LiteralPath $ManifestPath -PathType Leaf) {
            [System.IO.File]::Replace($temporaryManifestPath, $ManifestPath, $null)
        }
        else {
            Move-Item -LiteralPath $temporaryManifestPath -Destination $ManifestPath -Force
        }
    }
    finally {
        if (Test-Path -LiteralPath $temporaryManifestPath) {
            try {
                Remove-Item -LiteralPath $temporaryManifestPath -Force -ErrorAction Stop
            }
            catch {
                Write-Warning ("Failed to clean up temporary manifest '{0}': {1}" -f $temporaryManifestPath, $_.Exception.Message)
            }
        }
    }
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

$repositoryRootInput = if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) { Join-Path -Path $scriptRoot -ChildPath '..\..' } else { $RepositoryRoot }
$resolvedRepositoryRoot = Resolve-TokkiPath -Path $repositoryRootInput -BasePath $scriptRoot
$releaseRootInput = if ([string]::IsNullOrWhiteSpace($ReleaseRoot)) { 'dist\release' } else { $ReleaseRoot }
$resolvedReleaseRoot = Resolve-TokkiPath -Path $releaseRootInput -BasePath $resolvedRepositoryRoot
$manifestPathInput = if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
    Join-Path -Path $resolvedReleaseRoot -ChildPath 'tokki-release-manifest.json'
}
else {
    Resolve-TokkiPath -Path $ManifestPath -BasePath $resolvedRepositoryRoot
}

if (-not (Test-Path -LiteralPath $resolvedReleaseRoot -PathType Container)) {
    throw "Release root not found: $resolvedReleaseRoot"
}

$artifactExtensions = @('.zip', '.dmg')
$artifacts = @(
    Get-ChildItem -LiteralPath $resolvedReleaseRoot -File -Recurse |
        Where-Object {
            $extension = $_.Extension.ToLowerInvariant()
            $artifactExtensions -contains $extension
        } |
        Sort-Object -Property FullName
)

if ($artifacts.Count -eq 0) {
    throw "No release artifacts (*.zip or *.dmg) found under $resolvedReleaseRoot"
}

$artifactRecords = @()
foreach ($artifact in $artifacts) {
    $relativeArtifactPath = Get-TokkiRelativePath -BasePath $resolvedReleaseRoot -TargetPath $artifact.FullName
    $platform = Get-TokkiPlatformForArtifact -RelativePath $relativeArtifactPath -Extension $artifact.Extension.ToLowerInvariant()
    $architecture = Get-TokkiArchitectureForArtifact -FileName $artifact.Name
    $checksumPath = Join-Path -Path $artifact.DirectoryName -ChildPath ('{0}.sha256' -f [System.IO.Path]::GetFileNameWithoutExtension($artifact.Name))

    if (-not (Test-Path -LiteralPath $checksumPath -PathType Leaf)) {
        throw "Checksum file not found for $($artifact.FullName): $checksumPath"
    }

    $expectedHash = Read-TokkiChecksumFile -ChecksumPath $checksumPath -ExpectedAssetName $artifact.Name
    $actualHash = Get-TokkiFileSha256 -Path $artifact.FullName
    if ($expectedHash -ne $actualHash) {
        throw "Checksum mismatch for $($artifact.Name). Expected $expectedHash, got $actualHash."
    }

    $signatureFiles = @(Get-TokkiSignatureFiles -ArtifactPath $artifact.FullName)
    if ($RequireSignatures -and $signatureFiles.Count -eq 0) {
        throw "Signature sidecar missing for artifact $($artifact.Name). Expected one of .sig, .minisig, or .asc."
    }

    $relativeChecksumPath = Get-TokkiRelativePath -BasePath $resolvedReleaseRoot -TargetPath $checksumPath
    $relativeSignaturePaths = @($signatureFiles | ForEach-Object { Get-TokkiRelativePath -BasePath $resolvedReleaseRoot -TargetPath $_ })
    $artifactRecords += [ordered]@{
        platform = $platform
        architecture = $architecture
        fileName = $artifact.Name
        relativePath = $relativeArtifactPath
        checksumFile = $relativeChecksumPath
        sha256 = $actualHash
        signature = [ordered]@{
            required = [bool]$RequireSignatures
            status = if ($signatureFiles.Count -gt 0) { 'present' } else { 'missing' }
            files = $relativeSignaturePaths
        }
    }
}

$normalizedRequiredPlatforms = @(
    $RequiredPlatforms |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        ForEach-Object { $_.Trim().ToLowerInvariant() } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -Unique
)
$presentPlatforms = @($artifactRecords | ForEach-Object { [string]$_.platform } | Where-Object { $_ -ne 'unknown' } | Select-Object -Unique)
foreach ($requiredPlatform in $normalizedRequiredPlatforms) {
    if ($presentPlatforms -notcontains $requiredPlatform) {
        throw "Required release platform '$requiredPlatform' is missing from artifact set."
    }
}

$missingSignatureCount = @($artifactRecords | Where-Object { $_.signature.status -eq 'missing' }).Count
$manifest = [ordered]@{
    schemaVersion = 1
    generatedAtUtc = [DateTime]::UtcNow.ToString('o')
    releaseRoot = $resolvedReleaseRoot
    requireSignatures = [bool]$RequireSignatures
    requiredPlatforms = $normalizedRequiredPlatforms
    artifacts = $artifactRecords
    summary = [ordered]@{
        artifactCount = $artifactRecords.Count
        platforms = $presentPlatforms
        missingSignatures = $missingSignatureCount
    }
}

Write-TokkiManifestFile -Manifest $manifest -ManifestPath $manifestPathInput

[pscustomobject]@{
    ManifestPath = $manifestPathInput
    ArtifactCount = $artifactRecords.Count
    Platforms = $presentPlatforms
    MissingSignatures = $missingSignatureCount
    SignaturesRequired = [bool]$RequireSignatures
}
