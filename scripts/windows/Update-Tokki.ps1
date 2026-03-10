<#
.SYNOPSIS
Updates Tokki while preserving %LOCALAPPDATA%\Tokki user data.

.DESCRIPTION
Wrapper around Tokki.ps1 update for repository-local use and easy help output.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
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

$dispatcher = Join-Path -Path $PSScriptRoot -ChildPath 'Tokki.ps1'
if (-not (Test-Path -LiteralPath $dispatcher -PathType Leaf)) {
    throw "Tokki dispatcher not found: $dispatcher"
}

& $dispatcher 'update' @PSBoundParameters
