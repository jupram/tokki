<#
.SYNOPSIS
Tokki Windows install/update command.

.DESCRIPTION
Installs Tokki from GitHub Releases into %LOCALAPPDATA%\Tokki\app, preserves
user data in %LOCALAPPDATA%\Tokki, creates Start Menu shortcuts, and exposes a
tokki.cmd wrapper for future updates.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Position = 0)]
    [string]$Command = 'help',
    [Alias('h', '?')]
    [switch]$Help,
    [string]$Repository,
    [string]$Tag,
    [string]$InstallRoot,
    [string]$PackagePath,
    [string]$AssetName,
    [string]$AssetPattern,
    [string]$ConfigPath,
    [string]$GitHubToken,
    [switch]$Force,
    [switch]$NoLaunch,
    [switch]$NoShortcut,
    [switch]$NoPathUpdate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$supportFiles = @(
    'Tokki.ps1',
    'Install-Tokki.ps1',
    'Update-Tokki.ps1',
    'Tokki.Common.psm1',
    'Tokki.Release.json'
)

function Get-TokkiBootstrapHttpStatusCode {
    param(
        [System.Exception]$Exception
    )

    if ($null -eq $Exception) {
        return $null
    }

    $candidates = @($Exception, $Exception.InnerException)
    foreach ($candidate in $candidates) {
        if ($null -eq $candidate) {
            continue
        }

        if ($candidate.PSObject.Properties.Name -contains 'Response' -and $null -ne $candidate.Response) {
            $statusCode = $candidate.Response.StatusCode
            if ($null -eq $statusCode) {
                continue
            }

            try {
                return [int]$statusCode
            }
            catch {
                if ($statusCode.PSObject.Properties.Name -contains 'value__') {
                    try {
                        return [int]$statusCode.value__
                    }
                    catch {
                        # Ignore and continue.
                    }
                }
            }
        }
    }

    return $null
}

function Test-TokkiBootstrapRetryableFailure {
    param(
        [System.Exception]$Exception
    )

    if ($null -eq $Exception) {
        return $false
    }

    $statusCode = Get-TokkiBootstrapHttpStatusCode -Exception $Exception
    if ($null -ne $statusCode) {
        return ($statusCode -in @(408, 409, 425, 429, 500, 502, 503, 504))
    }

    if (
        $Exception -is [System.Net.WebException] -or
        $Exception -is [System.Net.Http.HttpRequestException] -or
        $Exception -is [System.TimeoutException] -or
        $Exception -is [System.IO.IOException] -or
        $Exception -is [System.Threading.Tasks.TaskCanceledException]
    ) {
        return $true
    }

    if ($null -ne $Exception.InnerException) {
        return Test-TokkiBootstrapRetryableFailure -Exception $Exception.InnerException
    }

    return $false
}

function Invoke-TokkiBootstrapDownload {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri,
        [Parameter(Mandatory = $true)]
        [string]$DestinationPath,
        [hashtable]$Headers
    )

    $parameters = @{
        Uri = $Uri
        OutFile = $DestinationPath
        Headers = $Headers
        ErrorAction = 'Stop'
    }

    $command = Get-Command -Name Invoke-WebRequest -ErrorAction Stop
    if ($command.Parameters.ContainsKey('UseBasicParsing')) {
        $parameters.UseBasicParsing = $true
    }

    $maxAttempts = 4
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        try {
            if (Test-Path -LiteralPath $DestinationPath -PathType Leaf) {
                Remove-Item -LiteralPath $DestinationPath -Force -ErrorAction Stop
            }

            Invoke-WebRequest @parameters | Out-Null
            return
        }
        catch {
            $exception = $_.Exception
            $canRetry = ($attempt -lt $maxAttempts) -and (Test-TokkiBootstrapRetryableFailure -Exception $exception)
            if (-not $canRetry) {
                throw "Bootstrap download failed for $Uri on attempt $attempt of $maxAttempts. $($exception.Message)"
            }

            $delaySeconds = [Math]::Max(1, [int][Math]::Round([Math]::Min(30, [Math]::Pow(2, $attempt - 1))))
            Write-Warning ("Bootstrap download retry {0}/{1} for {2} in {3}s: {4}" -f $attempt, $maxAttempts, $Uri, $delaySeconds, $exception.Message)
            Start-Sleep -Seconds $delaySeconds
        }
    }
}

function Get-TokkiBootstrapDirectory {
    param(
        [string]$RequestedConfigPath
    )

    if ($PSScriptRoot -and (Test-Path -LiteralPath (Join-Path -Path $PSScriptRoot -ChildPath 'Tokki.Common.psm1'))) {
        return [pscustomobject]@{
            SupportScriptsPath = $PSScriptRoot
            ConfigPath = if ([string]::IsNullOrWhiteSpace($RequestedConfigPath)) { Join-Path -Path $PSScriptRoot -ChildPath 'Tokki.Release.json' } else { $RequestedConfigPath }
            CleanupPath = $null
        }
    }

    $repository = 'jupram/tokki'
    $parts = $repository -split '/', 2
    $rawBase = 'https://raw.githubusercontent.com/{0}/{1}/main/scripts/windows' -f $parts[0], $parts[1]
    $tempDir = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ('TokkiBootstrap-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    try {
        foreach ($file in $supportFiles) {
            $uri = '{0}/{1}' -f $rawBase, $file
            $destination = Join-Path -Path $tempDir -ChildPath $file
            Invoke-TokkiBootstrapDownload -Uri $uri -DestinationPath $destination -Headers @{ 'User-Agent' = 'TokkiInstaller/1.0' }
        }
    }
    catch {
        if (Test-Path -LiteralPath $tempDir) {
            try {
                Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction Stop
            }
            catch {
                Write-Warning ("Could not remove bootstrap directory {0}: {1}" -f $tempDir, $_.Exception.Message)
            }
        }

        throw "Tokki bootstrap failed while downloading support scripts from $rawBase. $($_.Exception.Message)"
    }

    return [pscustomobject]@{
        SupportScriptsPath = $tempDir
        ConfigPath = if ([string]::IsNullOrWhiteSpace($RequestedConfigPath)) { Join-Path -Path $tempDir -ChildPath 'Tokki.Release.json' } else { $RequestedConfigPath }
        CleanupPath = $tempDir
    }
}

function Show-TokkiUsage {
    @'
Tokki Windows automation

Usage:
  Tokki.ps1 install [options]
  Tokki.ps1 update [options]
  Tokki.ps1 launch
  Tokki.ps1 status
  Tokki.ps1 help
  Tokki.ps1 -Help

Common options:
  -Tag v0.1.0             Install/update a specific GitHub release tag.
  -Repository owner/name  Override the default release repo (jupram/tokki).
  -InstallRoot <path>     Override %LOCALAPPDATA%\Tokki.
  -PackagePath <path>     Use a local extracted folder or .zip bundle instead of GitHub Releases.
  -NoLaunch               Skip launching Tokki after install/update.
  -NoShortcut             Skip Start Menu shortcut creation.
  -NoPathUpdate           Skip adding %LOCALAPPDATA%\Tokki\bin to the user PATH.
  -Force                  Reinstall/update even if the same tag is already recorded.
  -WhatIf                 Print the plan without changing the machine.

Examples:
  .\scripts\windows\Tokki.ps1 install
  .\scripts\windows\Tokki.ps1 update -Tag v0.1.0
  .\scripts\windows\Tokki.ps1 install -PackagePath .\dist\release\windows\tokki_0.1.0_x64.zip -NoLaunch
  tokki update

Data preservation:
  App files are installed under %LOCALAPPDATA%\Tokki\app.
  User data stays in %LOCALAPPDATA%\Tokki and is not removed during update.
'@ | Write-Host
}

function Resolve-TokkiCommand {
    param(
        [string]$InputCommand,
        [switch]$HelpRequested
    )

    if ($HelpRequested) {
        return 'help'
    }

    if ([string]::IsNullOrWhiteSpace($InputCommand)) {
        return 'help'
    }

    $normalizedCommand = $InputCommand.Trim().ToLowerInvariant()
    switch ($normalizedCommand) {
        'install' { return 'install' }
        'update' { return 'update' }
        'launch' { return 'launch' }
        'status' { return 'status' }
        'help' { return 'help' }
        '--help' { return 'help' }
        '/?' { return 'help' }
        '?' { return 'help' }
        default {
            Show-TokkiUsage
            throw "Unknown Tokki command '$InputCommand'. Supported commands: install, update, launch, status, help."
        }
    }
}

$resolvedCommand = Resolve-TokkiCommand -InputCommand $Command -HelpRequested:$Help
if ($resolvedCommand -eq 'help') {
    Show-TokkiUsage
    return
}

$bootstrapContext = $null
try {
    $bootstrapContext = Get-TokkiBootstrapDirectory -RequestedConfigPath $ConfigPath
    Import-Module (Join-Path -Path $bootstrapContext.SupportScriptsPath -ChildPath 'Tokki.Common.psm1') -Force

    switch ($resolvedCommand) {
        'install' {
            $result = Invoke-TokkiInstall -ConfigPath $bootstrapContext.ConfigPath -Repository $Repository -Tag $Tag -InstallRoot $InstallRoot -PackagePath $PackagePath -AssetName $AssetName -AssetPattern $AssetPattern -GitHubToken $GitHubToken -SupportScriptsPath $bootstrapContext.SupportScriptsPath -Force:$Force -NoLaunch:$NoLaunch -NoShortcut:$NoShortcut -NoPathUpdate:$NoPathUpdate -PlanOnly:$WhatIfPreference
            if ($null -ne $result) {
                $result
            }
        }
        'update' {
            $result = Invoke-TokkiUpdate -ConfigPath $bootstrapContext.ConfigPath -Repository $Repository -Tag $Tag -InstallRoot $InstallRoot -PackagePath $PackagePath -AssetName $AssetName -AssetPattern $AssetPattern -GitHubToken $GitHubToken -SupportScriptsPath $bootstrapContext.SupportScriptsPath -Force:$Force -NoLaunch:$NoLaunch -NoShortcut:$NoShortcut -NoPathUpdate:$NoPathUpdate -PlanOnly:$WhatIfPreference
            if ($null -ne $result) {
                $result
            }
        }
        'launch' {
            Start-TokkiInstalledApplication -ConfigPath $bootstrapContext.ConfigPath -InstallRoot $InstallRoot -PlanOnly:$WhatIfPreference
        }
        'status' {
            Show-TokkiStatus -ConfigPath $bootstrapContext.ConfigPath -Repository $Repository -InstallRoot $InstallRoot
        }
    }
}
finally {
    if ($null -ne $bootstrapContext -and -not [string]::IsNullOrWhiteSpace($bootstrapContext.CleanupPath) -and (Test-Path -LiteralPath $bootstrapContext.CleanupPath)) {
        try {
            Remove-Item -LiteralPath $bootstrapContext.CleanupPath -Recurse -Force -ErrorAction Stop
        }
        catch {
            Write-Verbose "Could not remove bootstrap directory $($bootstrapContext.CleanupPath): $($_.Exception.Message)"
        }
    }
}
