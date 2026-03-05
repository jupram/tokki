param(
    [string]$Repo = "jupram/tokki",
    [string]$Branch = "main",
    [string]$RequiredReviewer = "jupram"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI (gh) is required."
}

$payload = @{
    required_status_checks           = $null
    enforce_admins                   = $true
    required_pull_request_reviews    = @{
        dismiss_stale_reviews           = $true
        require_code_owner_reviews      = $true
        require_last_push_approval      = $true
        required_approving_review_count = 1
        bypass_pull_request_allowances  = @{
            users = @()
            teams = @()
            apps  = @()
        }
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

$json = $payload | ConvertTo-Json -Depth 10

$result = $json | gh api `
    --method PUT `
    -H "Accept: application/vnd.github+json" `
    "repos/$Repo/branches/$Branch/protection" `
    --input -

$protection = $result | ConvertFrom-Json
$reviews = $protection.required_pull_request_reviews

Write-Output "Updated branch protection for $Repo:$Branch"
Write-Output "Required approvals: $($reviews.required_approving_review_count)"
Write-Output "Code owner reviews required: $($reviews.require_code_owner_reviews)"
Write-Output "Last push approval required: $($reviews.require_last_push_approval)"
Write-Output "Admins enforced: $($protection.enforce_admins.enabled)"
Write-Output "Expected reviewer via CODEOWNERS: $RequiredReviewer"
