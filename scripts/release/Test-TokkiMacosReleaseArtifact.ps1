<#
.SYNOPSIS
Validates the portable Tokki macOS release artifact and checksum expectations.
#>
[CmdletBinding()]
param(
    [string]$ArtifactPath,
    [string]$RepositoryRoot,
    [string]$OutputDirectory,
    [ValidateSet('x64', 'arm64', 'neutral')]
    [string]$Architecture
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

function Get-TokkiLatestArtifactPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SearchRoot
    )

    if (-not (Test-Path -LiteralPath $SearchRoot -PathType Container)) {
        throw "Artifact search root not found: $SearchRoot"
    }

    $artifacts = @(Get-ChildItem -LiteralPath $SearchRoot -Filter '*.dmg' -File -Recurse -ErrorAction SilentlyContinue | Sort-Object -Property LastWriteTimeUtc -Descending)
    if ($artifacts.Count -eq 0) {
        throw "No .dmg artifacts found under $SearchRoot"
    }

    return $artifacts[0].FullName
}

function Get-TokkiMacArtifactArchitecture {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FileName
    )

    if ($FileName -match '(?i)_(x64|arm64|neutral)\.dmg$') {
        return $Matches[1].ToLowerInvariant()
    }

    if ($FileName -match '(?i)_universal\.dmg$') {
        return 'neutral'
    }

    return $null
}

function Get-TokkiChecksumRecord {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ChecksumPath,
        [Parameter(Mandatory = $true)]
        [string]$ArtifactName
    )

    if (-not (Test-Path -LiteralPath $ChecksumPath -PathType Leaf)) {
        throw "Checksum file not found: $ChecksumPath"
    }

    $checksumContent = (Get-Content -LiteralPath $ChecksumPath -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($checksumContent)) {
        throw "Checksum file is empty: $ChecksumPath"
    }

    if ($checksumContent -notmatch '^(?<hash>[A-Fa-f0-9]{64})(?:\s+\*?(?<name>[^\r\n]+))?$') {
        throw "Checksum file '$ChecksumPath' must start with a 64-character SHA256 hash and may optionally include the artifact name."
    }

    $referencedFileName = $null
    if (-not [string]::IsNullOrWhiteSpace($Matches['name'])) {
        $referencedFileName = [System.IO.Path]::GetFileName($Matches['name'].Trim())
        if ([string]::IsNullOrWhiteSpace($referencedFileName)) {
            throw "Checksum file '$ChecksumPath' includes an empty artifact name reference."
        }

        if ($referencedFileName -ne $ArtifactName) {
            throw "Checksum file '$ChecksumPath' references '$referencedFileName', but the validated artifact is '$ArtifactName'."
        }
    }

    return [pscustomobject]@{
        Hash = $Matches['hash'].ToLowerInvariant()
        ReferencedFileName = $referencedFileName
    }
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

function Invoke-TokkiNativeCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandPath,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    $output = & $CommandPath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        $details = ($output | Out-String).Trim()
        if ([string]::IsNullOrWhiteSpace($details)) {
            throw $FailureMessage
        }

        throw "$FailureMessage $details"
    }

    return $output
}

function Test-TokkiIsMacOS {
    $isMacOsVariable = Get-Variable -Name 'IsMacOS' -ErrorAction SilentlyContinue
    if ($null -ne $isMacOsVariable) {
        return [bool]$isMacOsVariable.Value
    }

    try {
        return [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::OSX)
    }
    catch {
        return $false
    }
}

function Get-TokkiHdiutilCommand {
    if (-not (Test-TokkiIsMacOS)) {
        return $null
    }

    return Get-Command -Name 'hdiutil' -ErrorAction SilentlyContinue
}

function New-TokkiTemporaryDirectory {
    $temporaryPath = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ([System.IO.Path]::GetRandomFileName())
    New-Item -ItemType Directory -Path $temporaryPath -Force | Out-Null
    return $temporaryPath
}

function Get-TokkiTopLevelEntrySummary {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootPath
    )

    $entries = @(Get-ChildItem -LiteralPath $RootPath -Force -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
    if ($entries.Count -eq 0) {
        return '(empty)'
    }

    return ($entries -join ', ')
}

function Test-TokkiMountedAppBundleLayout {
    param(
        [Parameter(Mandatory = $true)]
        [string]$MountPoint
    )

    $topLevelAppBundles = @(Get-ChildItem -LiteralPath $MountPoint -Directory -Filter '*.app' -ErrorAction SilentlyContinue | Sort-Object -Property Name)
    if ($topLevelAppBundles.Count -eq 0) {
        $nestedAppBundles = @(Get-ChildItem -LiteralPath $MountPoint -Directory -Filter '*.app' -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
        $nestedMessage = if ($nestedAppBundles.Count -gt 0) {
            ' Nested .app bundles were found only at: {0}.' -f ($nestedAppBundles -join ', ')
        }
        else {
            ''
        }

        throw "Mounted disk image does not contain a top-level .app bundle. Top-level entries: $(Get-TokkiTopLevelEntrySummary -RootPath $MountPoint).$nestedMessage"
    }

    if ($topLevelAppBundles.Count -gt 1) {
        throw "Mounted disk image contains multiple top-level .app bundles: $($topLevelAppBundles.Name -join ', ')"
    }

    $appBundle = $topLevelAppBundles[0]
    $contentsPath = Join-Path -Path $appBundle.FullName -ChildPath 'Contents'
    $infoPlistPath = Join-Path -Path $contentsPath -ChildPath 'Info.plist'
    $macOsPath = Join-Path -Path $contentsPath -ChildPath 'MacOS'

    if (-not (Test-Path -LiteralPath $contentsPath -PathType Container)) {
        throw "App bundle '$($appBundle.Name)' is missing the Contents directory."
    }

    if (-not (Test-Path -LiteralPath $infoPlistPath -PathType Leaf)) {
        throw "App bundle '$($appBundle.Name)' is missing Contents/Info.plist."
    }

    if (-not (Test-Path -LiteralPath $macOsPath -PathType Container)) {
        throw "App bundle '$($appBundle.Name)' is missing Contents/MacOS."
    }

    $executables = @(Get-ChildItem -LiteralPath $macOsPath -File -Force -ErrorAction SilentlyContinue | Sort-Object -Property Name)
    if ($executables.Count -eq 0) {
        throw "App bundle '$($appBundle.Name)' does not contain any executable files under Contents/MacOS."
    }

    return [pscustomobject]@{
        AppBundleName = $appBundle.Name
        ExecutableNames = @($executables | Select-Object -ExpandProperty Name)
    }
}

function Test-TokkiMacDiskImageLayout {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ArtifactPath,
        $HdiutilCommand
    )

    if ($null -eq $HdiutilCommand) {
        return [pscustomobject]@{
            Status = 'skipped'
            Reason = if (Test-TokkiIsMacOS) { 'hdiutil_unavailable' } else { 'non_macos_host' }
            AppBundleName = $null
            ExecutableNames = @()
        }
    }

    $mountPoint = New-TokkiTemporaryDirectory
    $mounted = $false
    $detached = $false
    try {
        Invoke-TokkiNativeCommand -CommandPath $HdiutilCommand.Source -Arguments @('attach', $ArtifactPath, '-readonly', '-nobrowse', '-mountpoint', $mountPoint) -FailureMessage "Failed to mount disk image '$ArtifactPath'."
        $mounted = $true
        if (-not (Test-Path -LiteralPath $mountPoint -PathType Container)) {
            throw "Disk image '$ArtifactPath' did not expose mount point '$mountPoint'."
        }

        $bundleLayout = Test-TokkiMountedAppBundleLayout -MountPoint $mountPoint
        return [pscustomobject]@{
            Status = 'passed'
            Reason = $null
            AppBundleName = $bundleLayout.AppBundleName
            ExecutableNames = $bundleLayout.ExecutableNames
        }
    }
    finally {
        if ($mounted) {
            try {
                Invoke-TokkiNativeCommand -CommandPath $HdiutilCommand.Source -Arguments @('detach', $mountPoint, '-force') -FailureMessage "Failed to detach disk image mounted at '$mountPoint'." | Out-Null
                $detached = $true
            }
            catch {
                Write-Warning "Failed to detach disk image mounted at '$mountPoint': $($_.Exception.Message)"
            }
        }

        if (($detached -or -not $mounted) -and (Test-Path -LiteralPath $mountPoint)) {
            Remove-Item -LiteralPath $mountPoint -Recurse -Force -ErrorAction SilentlyContinue
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

$repositoryRootInput = if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) { '..\..' } else { $RepositoryRoot }
$outputDirectoryInput = if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { 'dist\release\macos' } else { $OutputDirectory }

$resolvedRepositoryRoot = Resolve-TokkiPath -Path $repositoryRootInput -BasePath $scriptRoot
$resolvedOutputDirectory = Resolve-TokkiPath -Path $outputDirectoryInput -BasePath $resolvedRepositoryRoot
$resolvedArtifactPath = if ([string]::IsNullOrWhiteSpace($ArtifactPath)) {
    Get-TokkiLatestArtifactPath -SearchRoot $resolvedOutputDirectory
}
else {
    Resolve-TokkiPath -Path $ArtifactPath -BasePath $resolvedRepositoryRoot
}

if (-not (Test-Path -LiteralPath $resolvedArtifactPath -PathType Leaf)) {
    throw "Artifact not found: $resolvedArtifactPath"
}

$artifactName = Split-Path -Path $resolvedArtifactPath -Leaf
$resolvedArchitecture = if ([string]::IsNullOrWhiteSpace($Architecture)) {
    $inferredArchitecture = Get-TokkiMacArtifactArchitecture -FileName $artifactName
    if ([string]::IsNullOrWhiteSpace($inferredArchitecture)) {
        Get-TokkiDefaultArchitecture
    }
    else {
        $inferredArchitecture
    }
}
else {
    $Architecture
}

$requiredPattern = switch ($resolvedArchitecture) {
    'x64' { '(?i)^tokki_.*_x64\.dmg$' }
    'arm64' { '(?i)^tokki_.*_arm64\.dmg$' }
    'neutral' { '(?i)^tokki_.*_(neutral|universal)\.dmg$' }
    default { '(?i)^tokki_.*_(x64|arm64|neutral|universal)\.dmg$' }
}

if ($artifactName -notmatch $requiredPattern) {
    throw "Artifact '$artifactName' does not match expected naming for architecture '$resolvedArchitecture'."
}

$checksumPath = Join-Path -Path (Split-Path -Path $resolvedArtifactPath -Parent) -ChildPath ('{0}.sha256' -f [System.IO.Path]::GetFileNameWithoutExtension($artifactName))
$checksumRecord = Get-TokkiChecksumRecord -ChecksumPath $checksumPath -ArtifactName $artifactName
$expectedHash = $checksumRecord.Hash
$actualHash = Get-TokkiFileSha256 -Path $resolvedArtifactPath
if ($expectedHash -ne $actualHash) {
    throw "Checksum mismatch for $artifactName. Expected $expectedHash, got $actualHash."
}

$hdiutil = Get-TokkiHdiutilCommand
$diskImageVerification = 'skipped'
if ($null -ne $hdiutil) {
    Invoke-TokkiNativeCommand -CommandPath $hdiutil.Source -Arguments @('verify', $resolvedArtifactPath) -FailureMessage "Disk image verification failed for '$artifactName'." | Out-Null
    $diskImageVerification = 'passed'
}

$bundleLayoutValidation = Test-TokkiMacDiskImageLayout -ArtifactPath $resolvedArtifactPath -HdiutilCommand $hdiutil

[pscustomobject]@{
    ArtifactPath = $resolvedArtifactPath
    ArtifactName = $artifactName
    ChecksumPath = $checksumPath
    Architecture = $resolvedArchitecture
    ChecksumValidation = 'passed'
    DiskImageVerification = $diskImageVerification
    BundleLayoutValidation = $bundleLayoutValidation.Status
    AppBundleName = $bundleLayoutValidation.AppBundleName
}
