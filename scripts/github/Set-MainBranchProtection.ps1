[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
    [ValidatePattern("^[^/\s]+/[^/\s]+$")]
    [string]$Repo,

    [ValidateNotNullOrEmpty()]
    [string]$Branch,

    [ValidateNotNullOrEmpty()]
    [string]$RequiredReviewer
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,

        [string[]]$ArgumentList = @(),

        [string]$ErrorContext = $FilePath,

        [switch]$IgnoreExitCode
    )

    $output = & $FilePath @ArgumentList 2>&1
    $exitCode = $LASTEXITCODE
    $text = (($output | ForEach-Object { $_.ToString().TrimEnd() }) -join [Environment]::NewLine).Trim()

    if (-not $IgnoreExitCode -and $exitCode -ne 0) {
        $details = if ($text) { $text } else { "<no output>" }
        throw "$ErrorContext failed with exit code $exitCode.`n$details"
    }

    [pscustomobject]@{
        ExitCode = $exitCode
        Text     = $text
    }
}

function Convert-GitRemoteUrlToRepo {
    param(
        [Parameter(Mandatory)]
        [string]$RemoteUrl
    )

    if ($RemoteUrl -match 'github\.com[:/](?<owner>[^/:\s]+)/(?<name>[^/\s]+?)(?:\.git)?/?$') {
        return "$($Matches.owner)/$($Matches.name)"
    }

    return $null
}

function Get-ObjectPropertyValue {
    param(
        [AllowNull()]
        [object]$InputObject,

        [Parameter(Mandatory)]
        [string]$PropertyName,

        [AllowNull()]
        [object]$Default = $null
    )

    if ($null -eq $InputObject) {
        return $Default
    }

    $property = $InputObject.PSObject.Properties[$PropertyName]
    if ($null -eq $property) {
        return $Default
    }

    return $property.Value
}

function Format-Value {
    param(
        [AllowNull()]
        [object]$Value,

        [string]$Default = "<missing>"
    )

    if ($null -eq $Value) {
        return $Default
    }

    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $Default
    }

    return $text
}

function Resolve-Repository {
    param(
        [AllowNull()]
        [string]$RequestedRepo
    )

    if (-not [string]::IsNullOrWhiteSpace($RequestedRepo)) {
        return $RequestedRepo.Trim()
    }

    $remoteResult = Invoke-NativeCommand `
        -FilePath "git" `
        -ArgumentList @("config", "--get", "remote.origin.url") `
        -ErrorContext "git remote.origin.url lookup" `
        -IgnoreExitCode

    if (-not [string]::IsNullOrWhiteSpace($remoteResult.Text)) {
        $resolvedRepo = Convert-GitRemoteUrlToRepo -RemoteUrl $remoteResult.Text
        if ($resolvedRepo) {
            return $resolvedRepo
        }

        throw "Unable to parse a GitHub owner/name repository from remote.origin.url '$($remoteResult.Text)'. Pass -Repo owner/name explicitly."
    }

    if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_REPOSITORY)) {
        return $env:GITHUB_REPOSITORY.Trim()
    }

    throw "Unable to determine the GitHub repository. Pass -Repo owner/name, set GITHUB_REPOSITORY, or run from a checkout with a GitHub origin remote."
}

function Resolve-Branch {
    param(
        [AllowNull()]
        [string]$RequestedBranch,

        [Parameter(Mandatory)]
        [string]$Repository
    )

    if (-not [string]::IsNullOrWhiteSpace($RequestedBranch)) {
        return $RequestedBranch.Trim()
    }

    if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_EVENT_PATH) -and (Test-Path -LiteralPath $env:GITHUB_EVENT_PATH)) {
        try {
            $event = Get-Content -LiteralPath $env:GITHUB_EVENT_PATH -Raw | ConvertFrom-Json
            $eventRepository = Get-ObjectPropertyValue -InputObject $event -PropertyName "repository"
            $defaultBranch = Get-ObjectPropertyValue -InputObject $eventRepository -PropertyName "default_branch"
            if (-not [string]::IsNullOrWhiteSpace([string]$defaultBranch)) {
                return ([string]$defaultBranch).Trim()
            }
        }
        catch {
            Write-Verbose "Failed to parse GITHUB_EVENT_PATH '$($env:GITHUB_EVENT_PATH)': $($_.Exception.Message)"
        }
    }

    $originHead = Invoke-NativeCommand `
        -FilePath "git" `
        -ArgumentList @("symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD") `
        -ErrorContext "git default branch lookup" `
        -IgnoreExitCode

    if (-not [string]::IsNullOrWhiteSpace($originHead.Text)) {
        if ($originHead.Text -match '^[^/]+/(?<branch>.+)$') {
            return $Matches.branch
        }

        return $originHead.Text
    }

    throw "Unable to determine the default branch for '$Repository'. Pass -Branch explicitly instead of assuming 'main'."
}

function Invoke-GitHubApiForBranchProtection {
    param(
        [Parameter(Mandatory)]
        [string]$Repository,

        [Parameter(Mandatory)]
        [string]$TargetBranch,

        [Parameter(Mandatory)]
        [string]$PayloadFile
    )

    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw "GitHub CLI (gh) is required to update branch protection. Install gh or rerun with -WhatIf for a dry run."
    }

    $repoParts = $Repository.Split("/", 2)
    $ownerSegment = [System.Uri]::EscapeDataString($repoParts[0])
    $repoSegment = [System.Uri]::EscapeDataString($repoParts[1])
    $branchSegment = [System.Uri]::EscapeDataString($TargetBranch)
    $apiPath = "repos/$ownerSegment/$repoSegment/branches/$branchSegment/protection"

    $stderrPath = [System.IO.Path]::GetTempFileName()
    try {
        $stdout = gh api `
            --method PUT `
            -H "Accept: application/vnd.github+json" `
            $apiPath `
            --input $PayloadFile `
            2> $stderrPath

        $stdoutText = (($stdout | ForEach-Object { $_.ToString().TrimEnd() }) -join [Environment]::NewLine).Trim()
        $stderrText = if (Test-Path -LiteralPath $stderrPath) {
            (Get-Content -LiteralPath $stderrPath -Raw).Trim()
        }
        else {
            ""
        }

        if ($LASTEXITCODE -ne 0) {
            $details = if ($stderrText) { $stderrText } elseif ($stdoutText) { $stdoutText } else { "<no output>" }
            $authHint = if (-not [string]::IsNullOrWhiteSpace($env:GH_TOKEN) -or -not [string]::IsNullOrWhiteSpace($env:GITHUB_TOKEN)) {
                "Ensure the configured token has admin access to '$Repository'."
            }
            else {
                "Run 'gh auth login' or set GH_TOKEN/GITHUB_TOKEN with admin access to '$Repository'."
            }

            throw "GitHub CLI failed to update branch protection for '${Repository}:${TargetBranch}'.`n$authHint`n$details"
        }

        if ([string]::IsNullOrWhiteSpace($stdoutText)) {
            throw "GitHub CLI returned no JSON response while updating branch protection for '${Repository}:${TargetBranch}'."
        }

        return $stdoutText
    }
    finally {
        if (Test-Path -LiteralPath $stderrPath) {
            Remove-Item -LiteralPath $stderrPath -Force
        }
    }
}

$payload = @{
    required_status_checks           = $null
    enforce_admins                   = $true
    required_pull_request_reviews    = @{
        dismiss_stale_reviews           = $true
        require_code_owner_reviews      = $true
        require_last_push_approval      = $true
        required_approving_review_count = 1
    }
    restrictions                     = $null
    required_linear_history          = $false
    allow_force_pushes               = $false
    allow_deletions                  = $false
    block_creations                  = $false
    required_conversation_resolution = $true
    lock_branch                      = $false
    allow_fork_syncing               = $false
}

$resolvedRepo = Resolve-Repository -RequestedRepo $Repo
if ($resolvedRepo -notmatch '^[^/\s]+/[^/\s]+$') {
    throw "Repository '$resolvedRepo' is not in the expected owner/name format."
}

$resolvedBranch = Resolve-Branch -RequestedBranch $Branch -Repository $resolvedRepo

$json = $payload | ConvertTo-Json -Depth 10

$tmp = [System.IO.Path]::GetTempFileName()
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

try {
    Write-Output "Target repository: $resolvedRepo"
    Write-Output "Target branch: $resolvedBranch"
    Write-Output "Planned required approvals: $($payload.required_pull_request_reviews.required_approving_review_count)"
    Write-Output "Planned code owner reviews required: $($payload.required_pull_request_reviews.require_code_owner_reviews)"
    Write-Output "Planned last push approval required: $($payload.required_pull_request_reviews.require_last_push_approval)"
    Write-Output "Planned admins enforced: $($payload.enforce_admins)"

    if ($PSBoundParameters.ContainsKey("RequiredReviewer")) {
        Write-Output "Expected reviewer via CODEOWNERS: $RequiredReviewer"
    }

    if (-not $PSCmdlet.ShouldProcess("${resolvedRepo}:${resolvedBranch}", "Update branch protection")) {
        Write-Output "Dry run only; no GitHub API call was made."
        return
    }

    [System.IO.File]::WriteAllText($tmp, $json, $utf8NoBom)
    $result = Invoke-GitHubApiForBranchProtection -Repository $resolvedRepo -TargetBranch $resolvedBranch -PayloadFile $tmp
}
finally {
    if (Test-Path -LiteralPath $tmp) {
        Remove-Item -LiteralPath $tmp -Force
    }
}

try {
    $protection = $result | ConvertFrom-Json
}
catch {
    throw "GitHub API returned invalid JSON while updating branch protection for '${resolvedRepo}:${resolvedBranch}'. Raw response:`n$result"
}

$reviews = Get-ObjectPropertyValue -InputObject $protection -PropertyName "required_pull_request_reviews"
$enforceAdmins = Get-ObjectPropertyValue -InputObject $protection -PropertyName "enforce_admins"
$adminsEnabled = Get-ObjectPropertyValue -InputObject $enforceAdmins -PropertyName "enabled" -Default $enforceAdmins

Write-Output "Updated branch protection for ${resolvedRepo}:$resolvedBranch"
Write-Output "Required approvals: $(Format-Value (Get-ObjectPropertyValue -InputObject $reviews -PropertyName 'required_approving_review_count'))"
Write-Output "Code owner reviews required: $(Format-Value (Get-ObjectPropertyValue -InputObject $reviews -PropertyName 'require_code_owner_reviews'))"
Write-Output "Last push approval required: $(Format-Value (Get-ObjectPropertyValue -InputObject $reviews -PropertyName 'require_last_push_approval'))"
Write-Output "Admins enforced: $(Format-Value $adminsEnabled)"

if ($PSBoundParameters.ContainsKey("RequiredReviewer")) {
    Write-Output "Expected reviewer via CODEOWNERS: $RequiredReviewer"
}
