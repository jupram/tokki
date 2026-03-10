<#
.SYNOPSIS
Validates the portable Tokki Windows release artifact against installer expectations.
#>
[CmdletBinding()]
param(
    [string]$ArtifactPath,
    [string]$RepositoryRoot,
    [string]$ConfigPath,
    [ValidateSet('x64', 'arm64', 'neutral')]
    [string]$Architecture
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

function Get-TokkiAssetPatterns {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        [string]$ResolvedArchitecture
    )

    $patterns = New-Object System.Collections.Generic.List[string]
    foreach ($selector in @($Config.release.assetSelectors)) {
        if ($selector.architecture -eq $ResolvedArchitecture -or $selector.architecture -eq 'neutral') {
            foreach ($pattern in @($selector.patterns)) {
                $null = $patterns.Add([string]$pattern)
            }
        }
    }

    return $patterns.ToArray()
}

function Get-TokkiArtifactPatternMatch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ArtifactName,
        [Parameter(Mandatory = $true)]
        [string[]]$Patterns
    )

    for ($index = 0; $index -lt $Patterns.Count; $index++) {
        if ($ArtifactName -match $Patterns[$index]) {
            return [pscustomobject]@{
                Pattern = $Patterns[$index]
                Index = $index
            }
        }
    }

    return $null
}

function Get-TokkiLatestArtifactPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SearchRoot,
        [Parameter(Mandatory = $true)]
        [string[]]$Patterns
    )

    if (-not (Test-Path -LiteralPath $SearchRoot -PathType Container)) {
        throw "Artifact search root not found: $SearchRoot"
    }

    $artifacts = @(
        Get-ChildItem -LiteralPath $SearchRoot -Filter '*.zip' -File -ErrorAction SilentlyContinue |
            ForEach-Object {
                $match = Get-TokkiArtifactPatternMatch -ArtifactName $_.Name -Patterns $Patterns
                if ($null -ne $match) {
                    [pscustomobject]@{
                        FullName = $_.FullName
                        MatchIndex = $match.Index
                        LastWriteTimeUtc = $_.LastWriteTimeUtc
                    }
                }
            } |
            Sort-Object -Property @{ Expression = 'MatchIndex'; Descending = $false }, @{ Expression = 'LastWriteTimeUtc'; Descending = $true }, @{ Expression = 'FullName'; Descending = $false }
    )
    if ($artifacts.Count -eq 0) {
        throw "No .zip artifacts matching the configured release selectors were found under $SearchRoot"
    }

    return $artifacts[0].FullName
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

function Test-TokkiArchiveLayout {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ArtifactPath,
        [Parameter(Mandatory = $true)]
        [string]$PayloadDirectoryName,
        [Parameter(Mandatory = $true)]
        [string]$ExecutableName
    )

    Add-Type -AssemblyName 'System.IO.Compression.FileSystem' -ErrorAction SilentlyContinue

    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArtifactPath)
    try {
        $entries = @($archive.Entries | Where-Object { -not [string]::IsNullOrWhiteSpace($_.FullName) })
        if ($entries.Count -eq 0) {
            throw "Artifact archive is empty: $ArtifactPath"
        }

        $topLevelNames = New-Object System.Collections.Generic.HashSet[string] ([System.StringComparer]::InvariantCultureIgnoreCase)
        foreach ($entry in $entries) {
            $normalizedEntryPath = $entry.FullName.TrimStart('/').Replace('\', '/')
            if ([string]::IsNullOrWhiteSpace($normalizedEntryPath)) {
                continue
            }

            $pathSegments = @($normalizedEntryPath -split '/')
            $null = $topLevelNames.Add($pathSegments[0])
        }

        $topLevelArray = @($topLevelNames)
        if ($topLevelArray.Count -ne 1 -or -not [string]::Equals($topLevelArray[0], $PayloadDirectoryName, [System.StringComparison]::InvariantCultureIgnoreCase)) {
            throw "Artifact '$ArtifactPath' must contain exactly one top-level payload directory named '$PayloadDirectoryName'. Found: $($topLevelArray -join ', ')"
        }

        $expectedExecutableEntry = ('{0}/{1}' -f $PayloadDirectoryName, $ExecutableName).Replace('\', '/')
        $hasExecutable = @($entries | Where-Object { $_.FullName.TrimStart('/').Replace('\', '/') -eq $expectedExecutableEntry }).Count -gt 0
        if (-not $hasExecutable) {
            throw "Artifact '$ArtifactPath' is missing the expected payload executable '$expectedExecutableEntry'."
        }
    }
    finally {
        $archive.Dispose()
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
$configPathInput = if ([string]::IsNullOrWhiteSpace($ConfigPath)) { 'Tokki.Release.json' } else { $ConfigPath }

$resolvedRepositoryRoot = Resolve-TokkiPath -Path $repositoryRootInput -BasePath $scriptRoot
$resolvedConfigPath = Resolve-TokkiPath -Path $configPathInput -BasePath $scriptRoot
$config = Get-Content -LiteralPath $resolvedConfigPath -Raw | ConvertFrom-Json
$resolvedArchitecture = if ([string]::IsNullOrWhiteSpace($Architecture)) { Get-TokkiDefaultArchitecture } else { $Architecture }
$assetPatterns = @(Get-TokkiAssetPatterns -Config $config -ResolvedArchitecture $resolvedArchitecture)
if ($assetPatterns.Count -eq 0) {
    throw "Config file $resolvedConfigPath does not define any release asset selectors for architecture '$resolvedArchitecture'."
}

$configuredOutputDirectory = if ([string]::IsNullOrWhiteSpace([string]$config.release.outputDirectory)) { 'dist\release\windows' } else { [string]$config.release.outputDirectory }
$payloadDirectoryName = [string]$config.release.payloadDirectoryName
$executableName = [string]$config.install.executableName

if ([string]::IsNullOrWhiteSpace($payloadDirectoryName)) {
    throw "Config file $resolvedConfigPath is missing release.payloadDirectoryName."
}

if ([string]::IsNullOrWhiteSpace($executableName)) {
    throw "Config file $resolvedConfigPath is missing install.executableName."
}

$resolvedArtifactPath = if ([string]::IsNullOrWhiteSpace($ArtifactPath)) {
    Get-TokkiLatestArtifactPath -SearchRoot (Resolve-TokkiPath -Path $configuredOutputDirectory -BasePath $resolvedRepositoryRoot) -Patterns $assetPatterns
}
else {
    Resolve-TokkiPath -Path $ArtifactPath -BasePath $resolvedRepositoryRoot
}

if (-not (Test-Path -LiteralPath $resolvedArtifactPath -PathType Leaf)) {
    throw "Artifact not found: $resolvedArtifactPath"
}

$artifactName = Split-Path -Path $resolvedArtifactPath -Leaf
$match = Get-TokkiArtifactPatternMatch -ArtifactName $artifactName -Patterns $assetPatterns
$matchingPattern = if ($null -ne $match) { $match.Pattern } else { $null }

if ($null -eq $matchingPattern) {
    throw "Artifact '$artifactName' does not match the release asset selectors for architecture '$resolvedArchitecture'."
}

Test-TokkiArchiveLayout -ArtifactPath $resolvedArtifactPath -PayloadDirectoryName $payloadDirectoryName -ExecutableName $executableName

$checksumPath = Join-Path -Path (Split-Path -Path $resolvedArtifactPath -Parent) -ChildPath ('{0}.sha256' -f [System.IO.Path]::GetFileNameWithoutExtension($artifactName))
$expectedHash = Read-TokkiChecksumFile -ChecksumPath $checksumPath -ExpectedAssetName $artifactName
$actualHash = Get-TokkiFileSha256 -Path $resolvedArtifactPath
if ($expectedHash -ne $actualHash) {
    throw "Checksum mismatch for $artifactName. Expected $expectedHash, got $actualHash."
}

$tokkiScriptPath = Join-Path -Path $scriptRoot -ChildPath 'Tokki.ps1'
& $tokkiScriptPath install -PackagePath $resolvedArtifactPath -NoLaunch -WhatIf | Out-Null
& $tokkiScriptPath update -PackagePath $resolvedArtifactPath -NoLaunch -WhatIf | Out-Null

[pscustomobject]@{
    ArtifactPath = $resolvedArtifactPath
    ArtifactName = $artifactName
    ChecksumPath = $checksumPath
    MatchedPattern = $matchingPattern
    Architecture = $resolvedArchitecture
    InstallValidation = 'passed'
    UpdateValidation = 'passed'
}
