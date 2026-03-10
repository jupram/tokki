<#
.SYNOPSIS
Creates the portable Tokki Windows release artifact consumed by install/update automation.

.DESCRIPTION
Normalizes the output of `npm run tauri build` into a single zip whose name and
layout are defined in `scripts\windows\Tokki.Release.json`. The resulting
archive contains one top-level payload directory with `tokki.exe` and the
runtime files that can be copied into `%LOCALAPPDATA%\Tokki\app`.
#>
[CmdletBinding()]
param(
    [string]$RepositoryRoot,
    [string]$BundleRoot,
    [string]$OutputDirectory,
    [string]$ConfigPath,
    [string]$TauriConfigPath,
    [string]$PackageJsonPath,
    [ValidateSet('x64', 'arm64', 'neutral')]
    [string]$Architecture,
    [string]$Version
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

function Normalize-TokkiVersion {
    param(
        [string]$Version
    )

    if ([string]::IsNullOrWhiteSpace($Version)) {
        return $null
    }

    $trimmedVersion = $Version.Trim()
    return ($trimmedVersion -replace '^[vV]', '')
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

    $packageJson = Get-Content -LiteralPath $ResolvedPackageJsonPath -Raw | ConvertFrom-Json
    $tauriConfig = Get-Content -LiteralPath $ResolvedTauriConfigPath -Raw | ConvertFrom-Json

    $packageVersion = [string]$packageJson.version
    $tauriVersion = [string]$tauriConfig.version
    $resolvedVersion = if (-not [string]::IsNullOrWhiteSpace($RequestedVersion)) {
        Normalize-TokkiVersion -Version $RequestedVersion
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

    $cargoTomlPath = Join-Path -Path $ResolvedRepositoryRoot -ChildPath 'src-tauri\Cargo.toml'
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

function Resolve-TokkiPayloadSource {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SearchRoot,
        [Parameter(Mandatory = $true)]
        [string]$ExecutableName
    )

    if (-not (Test-Path -LiteralPath $SearchRoot -PathType Container)) {
        throw "Build output root not found: $SearchRoot"
    }

    $topLevelExecutable = Get-ChildItem -LiteralPath $SearchRoot -Filter $ExecutableName -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $topLevelExecutable) {
        $excludedDirectories = @('.fingerprint', 'build', 'bundle', 'deps', 'examples', 'incremental', 'nsis', 'wix')
        $excludedFiles = @('.cargo-lock')
        $excludedExtensions = @('.d', '.pdb')
        $items = @(Get-ChildItem -LiteralPath $SearchRoot -Force | Where-Object {
                if ($_.PSIsContainer) {
                    return $excludedDirectories -notcontains $_.Name
                }

                $extension = if ([string]::IsNullOrWhiteSpace($_.Extension)) { '' } else { $_.Extension.ToLowerInvariant() }
                return ($excludedFiles -notcontains $_.Name) -and ($excludedExtensions -notcontains $extension)
            })

        if ($items.Count -eq 0) {
            throw "Could not determine the portable payload contents under $SearchRoot."
        }

        return [pscustomobject]@{
            SourceRoot = $SearchRoot
            Items = $items
            SelectionMode = 'release-root'
        }
    }

    $matches = @(Get-ChildItem -LiteralPath $SearchRoot -Filter $ExecutableName -File -Recurse -ErrorAction SilentlyContinue | Sort-Object -Property FullName)
    if ($matches.Count -eq 0) {
        throw "Could not find $ExecutableName under $SearchRoot. Run npm run tauri build before packaging."
    }

    $candidateRoots = @($matches | ForEach-Object { Split-Path -Path $_.FullName -Parent } | Sort-Object -Unique)
    if ($candidateRoots.Count -eq 1) {
        $selectedItems = @(Get-ChildItem -LiteralPath $candidateRoots[0] -Force)
        if ($selectedItems.Count -eq 0) {
            throw "Selected payload root $($candidateRoots[0]) does not contain any items to package."
        }

        return [pscustomobject]@{
            SourceRoot = $candidateRoots[0]
            Items = $selectedItems
            SelectionMode = 'payload-root-single'
        }
    }

    $selected = $candidateRoots |
        ForEach-Object {
            $fileCount = @(Get-ChildItem -LiteralPath $_ -File -Recurse -Force -ErrorAction SilentlyContinue).Count
            [pscustomobject]@{
                Path = $_
                FileCount = $fileCount
                Depth = ($_ -split '[\\/]').Count
            }
        } |
        Sort-Object -Property @{ Expression = 'FileCount'; Descending = $true }, @{ Expression = 'Depth'; Descending = $false }, @{ Expression = 'Path'; Descending = $false } |
        Select-Object -First 1

    $selectedItems = @(Get-ChildItem -LiteralPath $selected.Path -Force)
    if ($selectedItems.Count -eq 0) {
        throw "Selected payload root $($selected.Path) does not contain any items to package."
    }

    Write-Verbose "Selected payload root $($selected.Path) from $($candidateRoots.Count) candidates."
    return [pscustomobject]@{
        SourceRoot = $selected.Path
        Items = $selectedItems
        SelectionMode = 'payload-root'
    }
}

function Copy-TokkiPayloadItems {
    param(
        [Parameter(Mandatory = $true)]
        $Items,
        [Parameter(Mandatory = $true)]
        [string]$DestinationPath
    )

    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    foreach ($item in @($Items)) {
        Copy-Item -LiteralPath $item.FullName -Destination $DestinationPath -Recurse -Force
    }
}

function Publish-TokkiFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePath,
        [Parameter(Mandatory = $true)]
        [string]$DestinationPath
    )

    if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
        throw "Publish source file not found: $SourcePath"
    }

    if (Test-Path -LiteralPath $DestinationPath -PathType Leaf) {
        [System.IO.File]::Replace($SourcePath, $DestinationPath, $null)
        return
    }

    Move-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
}

function Remove-TokkiTemporaryPath {
    param(
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
        return
    }

    try {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    }
    catch {
        Write-Warning ("Failed to clean up temporary path '{0}': {1}" -f $Path, $_.Exception.Message)
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
$tauriConfigPathInput = if ([string]::IsNullOrWhiteSpace($TauriConfigPath)) { 'src-tauri\tauri.conf.json' } else { $TauriConfigPath }
$packageJsonPathInput = if ([string]::IsNullOrWhiteSpace($PackageJsonPath)) { 'package.json' } else { $PackageJsonPath }

$resolvedRepositoryRoot = Resolve-TokkiPath -Path $repositoryRootInput -BasePath $scriptRoot
$resolvedConfigPath = Resolve-TokkiPath -Path $configPathInput -BasePath $scriptRoot
$resolvedTauriConfigPath = Resolve-TokkiPath -Path $tauriConfigPathInput -BasePath $resolvedRepositoryRoot
$resolvedPackageJsonPath = Resolve-TokkiPath -Path $packageJsonPathInput -BasePath $resolvedRepositoryRoot

$config = Get-Content -LiteralPath $resolvedConfigPath -Raw | ConvertFrom-Json
$resolvedArchitecture = if ([string]::IsNullOrWhiteSpace($Architecture)) { Get-TokkiDefaultArchitecture } else { $Architecture }
$resolvedVersion = Get-TokkiPackageVersion -ResolvedPackageJsonPath $resolvedPackageJsonPath -ResolvedTauriConfigPath $resolvedTauriConfigPath -ResolvedRepositoryRoot $resolvedRepositoryRoot -RequestedVersion $Version
$bundleRootInput = if ([string]::IsNullOrWhiteSpace($BundleRoot)) { 'src-tauri\target\release' } else { $BundleRoot }
$resolvedBundleRoot = Resolve-TokkiPath -Path $bundleRootInput -BasePath $resolvedRepositoryRoot
$configuredOutputDirectory = if ([string]::IsNullOrWhiteSpace([string]$config.release.outputDirectory)) { 'dist\release\windows' } else { [string]$config.release.outputDirectory }
$outputDirectoryInput = if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { $configuredOutputDirectory } else { $OutputDirectory }
$resolvedOutputDirectory = Resolve-TokkiPath -Path $outputDirectoryInput -BasePath $resolvedRepositoryRoot
$artifactNameTemplate = if ([string]::IsNullOrWhiteSpace([string]$config.release.artifactNameTemplate)) { 'tokki_{version}_{architecture}.zip' } else { [string]$config.release.artifactNameTemplate }
$workflowArtifactNameTemplate = if ([string]::IsNullOrWhiteSpace([string]$config.release.workflowArtifactNameTemplate)) { 'tokki-windows-release-{architecture}' } else { [string]$config.release.workflowArtifactNameTemplate }
$payloadDirectoryName = if ([string]::IsNullOrWhiteSpace([string]$config.release.payloadDirectoryName)) { 'tokki' } else { [string]$config.release.payloadDirectoryName }
$executableName = [string]$config.install.executableName

if ([string]::IsNullOrWhiteSpace($executableName)) {
    throw "Config file $resolvedConfigPath is missing install.executableName."
}

if ([string]::IsNullOrWhiteSpace($payloadDirectoryName)) {
    throw "Config file $resolvedConfigPath is missing release.payloadDirectoryName."
}

if ($payloadDirectoryName.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -ge 0 -or $payloadDirectoryName.Contains('\') -or $payloadDirectoryName.Contains('/')) {
    throw "Config file $resolvedConfigPath has an invalid release.payloadDirectoryName '$payloadDirectoryName'. Use a single directory name."
}

$artifactName = Format-TokkiTemplate -Template $artifactNameTemplate -Version $resolvedVersion -Architecture $resolvedArchitecture
$workflowArtifactName = Format-TokkiTemplate -Template $workflowArtifactNameTemplate -Version $resolvedVersion -Architecture $resolvedArchitecture

if ([string]::IsNullOrWhiteSpace($artifactName) -or -not ($artifactName -like '*.zip')) {
    throw "Resolved artifact name '$artifactName' is invalid. release.artifactNameTemplate must produce a .zip file name."
}

if ([string]::IsNullOrWhiteSpace($workflowArtifactName)) {
    throw "Resolved workflow artifact name is empty. Check release.workflowArtifactNameTemplate in $resolvedConfigPath."
}

$payloadSource = Resolve-TokkiPayloadSource -SearchRoot $resolvedBundleRoot -ExecutableName $executableName
$artifactPath = Join-Path -Path $resolvedOutputDirectory -ChildPath $artifactName
$checksumPath = Join-Path -Path $resolvedOutputDirectory -ChildPath ('{0}.sha256' -f [System.IO.Path]::GetFileNameWithoutExtension($artifactName))
$temporaryPublishSuffix = [Guid]::NewGuid().ToString('N')
$temporaryArtifactPath = Join-Path -Path $resolvedOutputDirectory -ChildPath ('{0}.{1}.tmp' -f $artifactName, $temporaryPublishSuffix)
$temporaryChecksumPath = Join-Path -Path $resolvedOutputDirectory -ChildPath ('{0}.{1}.tmp' -f (Split-Path -Path $checksumPath -Leaf), $temporaryPublishSuffix)
$tempRoot = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ('TokkiReleaseArtifact-' + [Guid]::NewGuid().ToString('N'))
$stagedPayloadRoot = Join-Path -Path $tempRoot -ChildPath $payloadDirectoryName

try {
    New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

    Copy-TokkiPayloadItems -Items $payloadSource.Items -DestinationPath $stagedPayloadRoot

    $stagedExecutablePath = Join-Path -Path $stagedPayloadRoot -ChildPath $executableName
    if (-not (Test-Path -LiteralPath $stagedExecutablePath -PathType Leaf)) {
        throw "Staged payload is missing ${executableName}: $stagedExecutablePath"
    }

    Compress-Archive -LiteralPath $stagedPayloadRoot -DestinationPath $temporaryArtifactPath -CompressionLevel Optimal -Force

    $hash = Get-TokkiFileSha256 -Path $temporaryArtifactPath
    Set-Content -LiteralPath $temporaryChecksumPath -Value ('{0} *{1}' -f $hash, (Split-Path -Path $artifactPath -Leaf)) -Encoding Ascii -NoNewline

    Publish-TokkiFile -SourcePath $temporaryArtifactPath -DestinationPath $artifactPath
    Publish-TokkiFile -SourcePath $temporaryChecksumPath -DestinationPath $checksumPath

    [pscustomobject]@{
        ArtifactName = $artifactName
        ArtifactPath = $artifactPath
        ChecksumPath = $checksumPath
        WorkflowArtifactName = $workflowArtifactName
        Version = $resolvedVersion
        Architecture = $resolvedArchitecture
        PayloadRoot = $payloadSource.SourceRoot
        PayloadSelectionMode = $payloadSource.SelectionMode
        OutputDirectory = $resolvedOutputDirectory
    }
}
finally {
    Remove-TokkiTemporaryPath -Path $tempRoot
    Remove-TokkiTemporaryPath -Path $temporaryArtifactPath
    Remove-TokkiTemporaryPath -Path $temporaryChecksumPath
}
