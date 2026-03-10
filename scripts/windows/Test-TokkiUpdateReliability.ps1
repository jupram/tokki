<#
.SYNOPSIS
Validates Tokki Windows update reliability: checksum gating, atomic swap, rollback, and data preservation.
#>
[CmdletBinding()]
param(
    [string]$TokkiScriptPath,
    [string]$WorkingDirectory
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

function Assert-TokkiCondition {
    param(
        [Parameter(Mandatory = $true)]
        [bool]$Condition,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
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

function New-TokkiMockPackage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$OutputDirectory,
        [Parameter(Mandatory = $true)]
        [string]$PackageStem,
        [Parameter(Mandatory = $true)]
        [string]$Version,
        [ValidateSet('valid', 'invalid')]
        [string]$ExecutableMode = 'valid',
        [switch]$CorruptChecksum
    )

    $packageWorkspace = Join-Path -Path $OutputDirectory -ChildPath ('pkg-' + [Guid]::NewGuid().ToString('N'))
    $payloadRoot = Join-Path -Path $packageWorkspace -ChildPath 'tokki'
    $zipPath = Join-Path -Path $OutputDirectory -ChildPath ('{0}.zip' -f $PackageStem)
    $checksumPath = Join-Path -Path $OutputDirectory -ChildPath ('{0}.sha256' -f $PackageStem)
    $exePath = Join-Path -Path $payloadRoot -ChildPath 'tokki.exe'

    New-Item -ItemType Directory -Path $payloadRoot -Force | Out-Null
    Set-Content -LiteralPath (Join-Path -Path $payloadRoot -ChildPath 'version.txt') -Value $Version -Encoding UTF8 -NoNewline
    Set-Content -LiteralPath (Join-Path -Path $payloadRoot -ChildPath 'build-marker.txt') -Value ('mock-{0}' -f $Version) -Encoding UTF8 -NoNewline

    if ($ExecutableMode -eq 'valid') {
        $sourceExecutable = Join-Path -Path $env:SystemRoot -ChildPath 'System32\cmd.exe'
        if (-not (Test-Path -LiteralPath $sourceExecutable -PathType Leaf)) {
            throw "Could not find source executable for mock package: $sourceExecutable"
        }

        Copy-Item -LiteralPath $sourceExecutable -Destination $exePath -Force
    }
    else {
        Set-Content -LiteralPath $exePath -Value 'invalid-executable-for-rollback-test' -Encoding Ascii -NoNewline
    }

    if (Test-Path -LiteralPath $zipPath -PathType Leaf) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    Compress-Archive -LiteralPath $payloadRoot -DestinationPath $zipPath -CompressionLevel Optimal -Force
    $hash = Get-TokkiFileSha256 -Path $zipPath
    if ($CorruptChecksum) {
        $hash = '0000000000000000000000000000000000000000000000000000000000000000'
    }

    Set-Content -LiteralPath $checksumPath -Value ('{0} *{1}' -f $hash, (Split-Path -Path $zipPath -Leaf)) -Encoding Ascii -NoNewline

    if (Test-Path -LiteralPath $packageWorkspace -PathType Container) {
        Remove-Item -LiteralPath $packageWorkspace -Recurse -Force
    }

    return [pscustomobject]@{
        ZipPath = $zipPath
        ChecksumPath = $checksumPath
        Version = $Version
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

$resolvedTokkiScript = if ([string]::IsNullOrWhiteSpace($TokkiScriptPath)) {
    Join-Path -Path $scriptRoot -ChildPath 'Tokki.ps1'
}
else {
    Resolve-TokkiPath -Path $TokkiScriptPath -BasePath $scriptRoot
}

if (-not (Test-Path -LiteralPath $resolvedTokkiScript -PathType Leaf)) {
    throw "Tokki dispatcher script not found: $resolvedTokkiScript"
}

$resolvedWorkingDirectory = if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
    Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ('TokkiUpdateReliability-' + [Guid]::NewGuid().ToString('N'))
}
else {
    Resolve-TokkiPath -Path $WorkingDirectory -BasePath $scriptRoot
}
$cleanupWorkingDirectory = [string]::IsNullOrWhiteSpace($WorkingDirectory)

New-Item -ItemType Directory -Path $resolvedWorkingDirectory -Force | Out-Null
$installRoot = Join-Path -Path $resolvedWorkingDirectory -ChildPath 'install-root'
$packagesRoot = Join-Path -Path $resolvedWorkingDirectory -ChildPath 'packages'
New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
New-Item -ItemType Directory -Path $packagesRoot -Force | Out-Null

try {
    $initialPackage = New-TokkiMockPackage -OutputDirectory $packagesRoot -PackageStem 'tokki_1.0.0_x64' -Version '1.0.0' -ExecutableMode 'valid'
    $updatedPackage = New-TokkiMockPackage -OutputDirectory $packagesRoot -PackageStem 'tokki_2.0.0_x64' -Version '2.0.0' -ExecutableMode 'valid'
    $checksumFailurePackage = New-TokkiMockPackage -OutputDirectory $packagesRoot -PackageStem 'tokki_3.0.0_x64' -Version '3.0.0' -ExecutableMode 'valid' -CorruptChecksum
    $launchFailurePackage = New-TokkiMockPackage -OutputDirectory $packagesRoot -PackageStem 'tokki_4.0.0_x64' -Version '4.0.0' -ExecutableMode 'invalid'

    & $resolvedTokkiScript install -InstallRoot $installRoot -Tag 'v1.0.0' -PackagePath $initialPackage.ZipPath -NoLaunch -NoShortcut -NoPathUpdate | Out-Null
    Assert-TokkiCondition -Condition (Test-Path -LiteralPath (Join-Path -Path $installRoot -ChildPath 'app\version.txt') -PathType Leaf) -Message 'Install did not create app\version.txt.'
    Assert-TokkiCondition -Condition ((Get-Content -LiteralPath (Join-Path -Path $installRoot -ChildPath 'app\version.txt') -Raw).Trim() -eq '1.0.0') -Message 'Initial install did not deploy version 1.0.0.'

    $userDataPath = Join-Path -Path $installRoot -ChildPath 'memory.db'
    $userDataContent = 'relationship-memory-never-overwrite'
    Set-Content -LiteralPath $userDataPath -Value $userDataContent -Encoding UTF8 -NoNewline

    & $resolvedTokkiScript update -InstallRoot $installRoot -Tag 'v2.0.0' -PackagePath $updatedPackage.ZipPath -NoLaunch -NoShortcut -NoPathUpdate | Out-Null
    Assert-TokkiCondition -Condition ((Get-Content -LiteralPath (Join-Path -Path $installRoot -ChildPath 'app\version.txt') -Raw).Trim() -eq '2.0.0') -Message 'Update did not deploy version 2.0.0.'
    Assert-TokkiCondition -Condition ((Get-Content -LiteralPath $userDataPath -Raw).Trim() -eq $userDataContent) -Message 'User data file was modified during update.'

    $backupPath = Join-Path -Path $installRoot -ChildPath 'app.previous'
    Assert-TokkiCondition -Condition (-not (Test-Path -LiteralPath $backupPath -PathType Container)) -Message 'Backup directory should not remain after successful update.'
    $stagingAfterSuccess = @(Get-ChildItem -LiteralPath $installRoot -Directory -Filter 'app.staging.*' -ErrorAction SilentlyContinue)
    Assert-TokkiCondition -Condition ($stagingAfterSuccess.Count -eq 0) -Message 'Staging directories should be cleaned up after successful update.'

    $checksumFailureDetected = $false
    try {
        & $resolvedTokkiScript update -InstallRoot $installRoot -Tag 'v3.0.0' -PackagePath $checksumFailurePackage.ZipPath -NoLaunch -NoShortcut -NoPathUpdate | Out-Null
    }
    catch {
        $checksumFailureDetected = $_.Exception.Message -match 'Checksum mismatch'
    }
    Assert-TokkiCondition -Condition $checksumFailureDetected -Message 'Expected checksum mismatch failure was not detected.'
    Assert-TokkiCondition -Condition ((Get-Content -LiteralPath (Join-Path -Path $installRoot -ChildPath 'app\version.txt') -Raw).Trim() -eq '2.0.0') -Message 'Checksum failure should not replace the currently installed app.'
    Assert-TokkiCondition -Condition ((Get-Content -LiteralPath $userDataPath -Raw).Trim() -eq $userDataContent) -Message 'User data changed after checksum failure path.'

    $launchFailureDetected = $false
    try {
        & $resolvedTokkiScript update -InstallRoot $installRoot -Tag 'v4.0.0' -PackagePath $launchFailurePackage.ZipPath -NoShortcut -NoPathUpdate | Out-Null
    }
    catch {
        $launchFailureDetected = $true
    }
    Assert-TokkiCondition -Condition $launchFailureDetected -Message 'Expected launch failure update path did not fail.'
    Assert-TokkiCondition -Condition ((Get-Content -LiteralPath (Join-Path -Path $installRoot -ChildPath 'app\version.txt') -Raw).Trim() -eq '2.0.0') -Message 'Launch failure should roll back to version 2.0.0.'
    Assert-TokkiCondition -Condition ((Get-Content -LiteralPath $userDataPath -Raw).Trim() -eq $userDataContent) -Message 'User data changed during launch rollback path.'
    Assert-TokkiCondition -Condition (-not (Test-Path -LiteralPath $backupPath -PathType Container)) -Message 'Backup directory remained after rollback.'
    $stagingAfterRollback = @(Get-ChildItem -LiteralPath $installRoot -Directory -Filter 'app.staging.*' -ErrorAction SilentlyContinue)
    Assert-TokkiCondition -Condition ($stagingAfterRollback.Count -eq 0) -Message 'Staging directories should be cleaned up after rollback.'

    $status = & $resolvedTokkiScript status -InstallRoot $installRoot
    Assert-TokkiCondition -Condition ($status.installedTag -eq 'v2.0.0') -Message ("Install state should remain on v2.0.0 after rollback, found: {0}" -f $status.installedTag)
    Assert-TokkiCondition -Condition (-not $status.backupRecoveryPending) -Message 'Status indicates pending backup recovery after rollback.'

    [pscustomobject]@{
        installRoot = $installRoot
        checksumVerification = 'passed'
        atomicSwap = 'passed'
        rollbackSafety = 'passed'
        userDataPreservation = 'passed'
        finalTag = $status.installedTag
    }
}
finally {
    if ($cleanupWorkingDirectory -and (Test-Path -LiteralPath $resolvedWorkingDirectory -PathType Container)) {
        Remove-Item -LiteralPath $resolvedWorkingDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }
}
