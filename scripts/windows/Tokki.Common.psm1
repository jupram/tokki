Set-StrictMode -Version Latest

function Initialize-TokkiSecurityProtocol {
    try {
        $tls12 = [System.Net.SecurityProtocolType]::Tls12
        try {
            $tls13 = [System.Net.SecurityProtocolType]::Tls13
            [System.Net.ServicePointManager]::SecurityProtocol = $tls12 -bor $tls13
        }
        catch {
            [System.Net.ServicePointManager]::SecurityProtocol = $tls12
        }
    }
    catch {
        # Best effort only; newer PowerShell versions do not require this.
    }
}

function Read-TokkiConfiguration {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ConfigPath
    )

    $resolvedConfigPath = Resolve-TokkiFullPath -Path $ConfigPath
    if (-not (Test-Path -LiteralPath $resolvedConfigPath -PathType Leaf)) {
        throw "Tokki config file not found: $resolvedConfigPath"
    }

    return (Get-Content -LiteralPath $resolvedConfigPath -Raw -ErrorAction Stop | ConvertFrom-Json)
}

function Split-TokkiRepository {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Repository
    )

    $parts = $Repository -split '/', 2
    if ($parts.Count -ne 2 -or [string]::IsNullOrWhiteSpace($parts[0]) -or [string]::IsNullOrWhiteSpace($parts[1])) {
        throw "Repository must use the form 'owner/name'. Received: $Repository"
    }

    return [pscustomobject]@{
        Owner = $parts[0]
        Name = $parts[1]
    }
}

function Get-TokkiRepositoryInfo {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [string]$Repository
    )

    $owner = $Config.repository.owner
    $name = $Config.repository.name

    if (-not [string]::IsNullOrWhiteSpace($Repository)) {
        $repoParts = Split-TokkiRepository -Repository $Repository
        $owner = $repoParts.Owner
        $name = $repoParts.Name
    }

    return [pscustomobject]@{
        Owner = $owner
        Name = $name
        FullName = '{0}/{1}' -f $owner, $name
        ApiBaseUrl = $Config.repository.apiBaseUrl.TrimEnd('/')
        RawBaseUrlTemplate = $Config.repository.rawBaseUrlTemplate
        BootstrapRef = $Config.repository.bootstrapRef
    }
}

function Resolve-TokkiFullPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $expanded = [Environment]::ExpandEnvironmentVariables($Path)
    return [System.IO.Path]::GetFullPath($expanded)
}

function Resolve-TokkiPathTemplate {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Template
    )

    return Resolve-TokkiFullPath -Path $Template
}

function Get-TokkiInstallLayout {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [string]$InstallRoot
    )

    $root = if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
        Resolve-TokkiPathTemplate -Template $Config.install.rootDir
    }
    else {
        Resolve-TokkiFullPath -Path $InstallRoot
    }

    $appDir = Join-Path -Path $root -ChildPath $Config.install.appDirName
    $binDir = Join-Path -Path $root -ChildPath $Config.install.binDirName
    $stateDir = Join-Path -Path $root -ChildPath $Config.install.stateDirName
    $logsDir = Join-Path -Path $root -ChildPath $Config.install.logsDirName
    $cacheDir = Join-Path -Path $root -ChildPath $Config.install.cacheDirName
    $backupDir = Join-Path -Path $root -ChildPath $Config.install.backupDirName
    $programsDir = Join-Path -Path ([Environment]::GetFolderPath('Programs')) -ChildPath $Config.install.startMenuFolder
    $shortcutPath = Join-Path -Path $programsDir -ChildPath $Config.install.shortcutName
    $updateShortcutPath = Join-Path -Path $programsDir -ChildPath $Config.install.updateShortcutName
    $statePath = Join-Path -Path $stateDir -ChildPath 'install-state.json'
    $dispatcherPath = Join-Path -Path $binDir -ChildPath 'Tokki.ps1'
    $commandWrapperPath = Join-Path -Path $binDir -ChildPath 'tokki.cmd'
    $executablePath = Join-Path -Path $appDir -ChildPath $Config.install.executableName

    return [pscustomobject]@{
        Root = $root
        AppDir = $appDir
        BinDir = $binDir
        StateDir = $stateDir
        LogsDir = $logsDir
        CacheDir = $cacheDir
        BackupDir = $backupDir
        ProgramsDir = $programsDir
        ShortcutPath = $shortcutPath
        UpdateShortcutPath = $updateShortcutPath
        StatePath = $statePath
        DispatcherPath = $dispatcherPath
        CommandWrapperPath = $commandWrapperPath
        ExecutableName = $Config.install.executableName
        ExecutablePath = $executablePath
    }
}

function Get-TokkiArchitecture {
    if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
        return 'arm64'
    }

    if ($env:PROCESSOR_ARCHITECTURE -eq 'AMD64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'AMD64') {
        return 'x64'
    }

    return 'neutral'
}

function Get-TokkiAssetPatterns {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        [string]$Architecture
    )

    $patterns = New-Object System.Collections.Generic.List[string]
    foreach ($selector in @($Config.release.assetSelectors)) {
        if ($selector.architecture -eq $Architecture -or $selector.architecture -eq 'neutral') {
            foreach ($pattern in @($selector.patterns)) {
                $null = $patterns.Add([string]$pattern)
            }
        }
    }

    return $patterns.ToArray()
}

function Get-TokkiReleaseApiUri {
    param(
        [Parameter(Mandatory = $true)]
        $RepositoryInfo,
        [string]$Tag
    )

    if ([string]::IsNullOrWhiteSpace($Tag)) {
        return '{0}/repos/{1}/{2}/releases/latest' -f $RepositoryInfo.ApiBaseUrl, $RepositoryInfo.Owner, $RepositoryInfo.Name
    }

    return '{0}/repos/{1}/{2}/releases/tags/{3}' -f $RepositoryInfo.ApiBaseUrl, $RepositoryInfo.Owner, $RepositoryInfo.Name, ([uri]::EscapeDataString($Tag))
}

function Get-TokkiErrorMessage {
    param(
        [Parameter(Mandatory = $true)]
        [System.Exception]$Exception
    )

    $messages = New-Object System.Collections.Generic.List[string]
    $current = $Exception
    while ($null -ne $current) {
        if (-not [string]::IsNullOrWhiteSpace($current.Message)) {
            $null = $messages.Add($current.Message.Trim())
        }

        $current = $current.InnerException
    }

    $distinctMessages = @($messages | Select-Object -Unique)
    if ($distinctMessages.Count -eq 0) {
        return $Exception.GetType().FullName
    }

    return ($distinctMessages -join ' | ')
}

function Get-TokkiHttpStatusCode {
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
                        # Ignore and continue trying other representations.
                    }
                }
            }
        }
    }

    return $null
}

function Test-TokkiTransientFailure {
    param(
        [System.Exception]$Exception
    )

    if ($null -eq $Exception) {
        return $false
    }

    $statusCode = Get-TokkiHttpStatusCode -Exception $Exception
    if ($null -ne $statusCode) {
        if ($statusCode -in @(408, 409, 425, 429, 500, 502, 503, 504)) {
            return $true
        }

        return $false
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
        return Test-TokkiTransientFailure -Exception $Exception.InnerException
    }

    return $false
}

function Invoke-TokkiWithRetry {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Operation,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action,
        [int]$MaxAttempts = 4,
        [int]$InitialDelaySeconds = 1
    )

    if ($MaxAttempts -lt 1) {
        throw "MaxAttempts must be greater than zero for operation '$Operation'."
    }

    $attempt = 0
    while ($attempt -lt $MaxAttempts) {
        $attempt++
        try {
            return & $Action
        }
        catch {
            $exception = $_.Exception
            $message = Get-TokkiErrorMessage -Exception $exception
            $canRetry = ($attempt -lt $MaxAttempts) -and (Test-TokkiTransientFailure -Exception $exception)
            if (-not $canRetry) {
                throw "$Operation failed on attempt $attempt of $MaxAttempts. $message"
            }

            $delaySeconds = [Math]::Max(1, [int][Math]::Round([Math]::Min(30, [Math]::Pow(2, $attempt - 1) * [Math]::Max($InitialDelaySeconds, 1))))
            Write-Warning ("{0} failed (attempt {1}/{2}). Retrying in {3}s. {4}" -f $Operation, $attempt, $MaxAttempts, $delaySeconds, $message)
            Start-Sleep -Seconds $delaySeconds
        }
    }

    throw "$Operation failed after $MaxAttempts attempts."
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

function Get-TokkiChecksumCandidates {
    param(
        [Parameter(Mandatory = $true)]
        [string]$AssetName
    )

    $normalizedAssetName = [System.IO.Path]::GetFileName($AssetName)
    $withoutExtension = [System.IO.Path]::GetFileNameWithoutExtension($normalizedAssetName)
    return @(
        '{0}.sha256' -f $withoutExtension
        '{0}.sha256' -f $normalizedAssetName
    ) | Select-Object -Unique
}

function Resolve-TokkiLocalChecksumPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackagePath
    )

    $packageDirectory = Split-Path -Path $PackagePath -Parent
    $packageName = Split-Path -Path $PackagePath -Leaf
    $checksumCandidates = @(Get-TokkiChecksumCandidates -AssetName $packageName)

    foreach ($checksumCandidate in $checksumCandidates) {
        $candidatePath = Join-Path -Path $packageDirectory -ChildPath $checksumCandidate
        if (Test-Path -LiteralPath $candidatePath -PathType Leaf) {
            return $candidatePath
        }
    }

    throw "Checksum file not found for $packageName. Expected one of: $($checksumCandidates -join ', ') in $packageDirectory"
}

function Invoke-TokkiRestMethod {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri,
        [hashtable]$Headers
    )

    Initialize-TokkiSecurityProtocol

    $parameters = @{
        Uri = $Uri
        Headers = $Headers
        ErrorAction = 'Stop'
    }

    $command = Get-Command -Name Invoke-RestMethod -ErrorAction Stop
    if ($command.Parameters.ContainsKey('UseBasicParsing')) {
        $parameters.UseBasicParsing = $true
    }

    return Invoke-TokkiWithRetry -Operation ("Fetch release metadata from {0}" -f $Uri) -Action {
        Invoke-RestMethod @parameters
    }
}

function Invoke-TokkiDownloadFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri,
        [Parameter(Mandatory = $true)]
        [string]$DestinationPath,
        [hashtable]$Headers
    )

    Initialize-TokkiSecurityProtocol

    $parent = Split-Path -Path $DestinationPath -Parent
    if (-not [string]::IsNullOrWhiteSpace($parent) -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

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

    Invoke-TokkiWithRetry -Operation ("Download {0}" -f $Uri) -Action {
        if (Test-Path -LiteralPath $DestinationPath -PathType Leaf) {
            Remove-Item -LiteralPath $DestinationPath -Force -ErrorAction Stop
        }

        Invoke-WebRequest @parameters | Out-Null
    } | Out-Null
}

function Normalize-TokkiVersion {
    param(
        [string]$Tag
    )

    if ([string]::IsNullOrWhiteSpace($Tag)) {
        return $null
    }

    return $Tag.TrimStart('v')
}

function Get-TokkiReleaseMetadata {
    param(
        [Parameter(Mandatory = $true)]
        $RepositoryInfo,
        [string]$Tag,
        [string]$GitHubToken,
        [switch]$PlanOnly
    )

    $uri = Get-TokkiReleaseApiUri -RepositoryInfo $RepositoryInfo -Tag $Tag
    if ($PlanOnly) {
        return [pscustomobject]@{
            dryRun = $true
            tag_name = if ([string]::IsNullOrWhiteSpace($Tag)) { '<latest>' } else { $Tag }
            api_uri = $uri
            assets = @()
        }
    }

    $headers = @{
        'Accept' = 'application/vnd.github+json'
        'User-Agent' = 'TokkiInstaller/1.0'
    }

    if (-not [string]::IsNullOrWhiteSpace($GitHubToken)) {
        $headers.Authorization = 'Bearer {0}' -f $GitHubToken
    }

    return Invoke-TokkiRestMethod -Uri $uri -Headers $headers
}

function Select-TokkiReleaseAsset {
    param(
        [Parameter(Mandatory = $true)]
        $ReleaseMetadata,
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        [string]$Architecture,
        [string]$AssetName,
        [string]$AssetPattern
    )

    if ($ReleaseMetadata.PSObject.Properties.Name -contains 'dryRun' -and $ReleaseMetadata.dryRun) {
        $placeholderAssetName = if (-not [string]::IsNullOrWhiteSpace($AssetName)) { $AssetName } elseif (-not [string]::IsNullOrWhiteSpace($AssetPattern)) { $AssetPattern } else { '<selected zip asset>' }
        $checksumCandidates = if ($placeholderAssetName -like '*.zip') { @(Get-TokkiChecksumCandidates -AssetName $placeholderAssetName) } else { @('<matching sha256 file>') }
        return [pscustomobject]@{
            Name = $placeholderAssetName
            BrowserDownloadUrl = '<downloaded-from-github-releases>'
            ChecksumName = $checksumCandidates[0]
            ChecksumDownloadUrl = '<downloaded-checksum-from-github-releases>'
            Tag = $ReleaseMetadata.tag_name
            Version = Normalize-TokkiVersion -Tag $ReleaseMetadata.tag_name
        }
    }

    $assets = @($ReleaseMetadata.assets)
    if ($assets.Count -eq 0) {
        throw 'The selected GitHub release does not contain any assets.'
    }

    $selected = $null

    if (-not [string]::IsNullOrWhiteSpace($AssetName)) {
        $selected = $assets | Where-Object { $_.name -eq $AssetName } | Select-Object -First 1
    }
    elseif (-not [string]::IsNullOrWhiteSpace($AssetPattern)) {
        $selected = $assets | Where-Object { $_.name -match $AssetPattern } | Select-Object -First 1
    }
    else {
        foreach ($pattern in (Get-TokkiAssetPatterns -Config $Config -Architecture $Architecture)) {
            $selected = $assets | Where-Object { $_.name -match $pattern } | Select-Object -First 1
            if ($null -ne $selected) {
                break
            }
        }
    }

    if ($null -eq $selected) {
        $preferredExtension = [string]$Config.release.preferredExtension
        $selected = $assets | Where-Object { $_.name -like ('*{0}' -f $preferredExtension) } | Select-Object -First 1
    }

    if ($null -eq $selected) {
        $assetList = (($assets | ForEach-Object { $_.name }) -join ', ')
        throw "Could not find a matching release asset. Available assets: $assetList"
    }

    if (-not ($selected.name -like '*.zip')) {
        throw "Selected asset '$($selected.name)' is not a .zip bundle. Tokki install/update automation expects the Windows release zip so app files can be replaced without touching %LOCALAPPDATA%\Tokki user data."
    }

    $checksumAsset = $null
    $checksumCandidates = @(Get-TokkiChecksumCandidates -AssetName $selected.name)
    foreach ($checksumCandidate in $checksumCandidates) {
        $checksumAsset = $assets | Where-Object {
            [string]::Equals($_.name, $checksumCandidate, [System.StringComparison]::InvariantCultureIgnoreCase)
        } | Select-Object -First 1
        if ($null -ne $checksumAsset) {
            break
        }
    }

    if ($null -eq $checksumAsset) {
        $assetList = (($assets | ForEach-Object { $_.name }) -join ', ')
        throw "Could not find checksum asset for '$($selected.name)'. Expected one of: $($checksumCandidates -join ', '). Available assets: $assetList"
    }

    return [pscustomobject]@{
        Name = $selected.name
        BrowserDownloadUrl = $selected.browser_download_url
        ChecksumName = $checksumAsset.name
        ChecksumDownloadUrl = $checksumAsset.browser_download_url
        Tag = $ReleaseMetadata.tag_name
        Version = Normalize-TokkiVersion -Tag $ReleaseMetadata.tag_name
    }
}

function Get-TokkiPackageSource {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        $RepositoryInfo,
        [string]$Tag,
        [string]$PackagePath,
        [string]$AssetName,
        [string]$AssetPattern,
        [string]$GitHubToken,
        [switch]$PlanOnly
    )

    if (-not [string]::IsNullOrWhiteSpace($PackagePath)) {
        $resolvedPackage = Resolve-TokkiFullPath -Path $PackagePath
        if (-not (Test-Path -LiteralPath $resolvedPackage)) {
            throw "Package path not found: $resolvedPackage"
        }

        $isContainer = Test-Path -LiteralPath $resolvedPackage -PathType Container
        $isFile = Test-Path -LiteralPath $resolvedPackage -PathType Leaf
        if (-not $isContainer -and -not $isFile) {
            throw "Package path is neither a file nor a directory: $resolvedPackage"
        }

        $checksumPath = $null
        $checksumStatus = 'skipped-local-directory'
        if ($isFile) {
            if (-not ($resolvedPackage -like '*.zip')) {
                throw "Package path must point to an extracted folder or a .zip bundle. Received: $resolvedPackage"
            }

            $checksumPath = Resolve-TokkiLocalChecksumPath -PackagePath $resolvedPackage
            $checksumStatus = 'required'
        }

        return [pscustomobject]@{
            Mode = 'LocalPackage'
            PackagePath = $resolvedPackage
            IsDirectory = $isContainer
            Tag = $Tag
            Version = Normalize-TokkiVersion -Tag $Tag
            AssetName = Split-Path -Path $resolvedPackage -Leaf
            ChecksumPath = $checksumPath
            ChecksumStatus = $checksumStatus
            Descriptor = $resolvedPackage
        }
    }

    $releaseMetadata = Get-TokkiReleaseMetadata -RepositoryInfo $RepositoryInfo -Tag $Tag -GitHubToken $GitHubToken -PlanOnly:$PlanOnly
    $asset = Select-TokkiReleaseAsset -ReleaseMetadata $releaseMetadata -Config $Config -Architecture (Get-TokkiArchitecture) -AssetName $AssetName -AssetPattern $AssetPattern

    return [pscustomobject]@{
        Mode = if ($PlanOnly) { 'DryRun' } else { 'GitHubRelease' }
        ReleaseMetadata = $releaseMetadata
        Tag = $asset.Tag
        Version = $asset.Version
        AssetName = $asset.Name
        DownloadUrl = $asset.BrowserDownloadUrl
        ChecksumName = $asset.ChecksumName
        ChecksumDownloadUrl = $asset.ChecksumDownloadUrl
        ChecksumStatus = if ($PlanOnly) { 'dry-run' } else { 'required' }
        Descriptor = if ($PlanOnly) { $releaseMetadata.api_uri } else { $asset.BrowserDownloadUrl }
    }
}

function New-TokkiTempDirectory {
    $tempRoot = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ('Tokki-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    return $tempRoot
}

function Find-TokkiPayloadRoot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootPath,
        [Parameter(Mandatory = $true)]
        [string]$ExecutableName
    )

    $matches = @(Get-ChildItem -LiteralPath $RootPath -Filter $ExecutableName -File -Recurse -ErrorAction SilentlyContinue)
    if ($matches.Count -eq 0) {
        $matches = @(Get-ChildItem -LiteralPath $RootPath -Filter '*.exe' -File -Recurse -ErrorAction SilentlyContinue | Sort-Object -Property FullName)
    }

    if ($matches.Count -eq 0) {
        throw "Could not find $ExecutableName inside $RootPath"
    }

    return (Split-Path -Path $matches[0].FullName -Parent)
}

function Expand-TokkiPackageSource {
    param(
        [Parameter(Mandatory = $true)]
        $PackageSource,
        [Parameter(Mandatory = $true)]
        [string]$ExecutableName,
        [string]$WorkingDirectory,
        [string]$GitHubToken
    )

    if ($PackageSource.Mode -eq 'DryRun') {
        return [pscustomobject]@{
            PayloadRoot = '<expanded-release-payload>'
            CleanupPath = $null
            ChecksumStatus = 'dry-run'
            ChecksumPath = $null
        }
    }

    $ownsWorkingRoot = [string]::IsNullOrWhiteSpace($WorkingDirectory)
    $workingRoot = if ($ownsWorkingRoot) {
        New-TokkiTempDirectory
    }
    else {
        Resolve-TokkiFullPath -Path $WorkingDirectory
    }

    $expandedDir = Join-Path -Path $workingRoot -ChildPath 'expanded'
    $searchRoot = $null
    $checksumStatus = 'not-applicable'
    $resolvedChecksumPath = $null
    $completed = $false

    try {
        if ($PackageSource.Mode -eq 'GitHubRelease') {
            if ([string]::IsNullOrWhiteSpace($PackageSource.AssetName) -or [string]::IsNullOrWhiteSpace($PackageSource.DownloadUrl)) {
                throw 'Release package source is missing asset download metadata.'
            }

            if ([string]::IsNullOrWhiteSpace($PackageSource.ChecksumName) -or [string]::IsNullOrWhiteSpace($PackageSource.ChecksumDownloadUrl)) {
                throw "Release package source for '$($PackageSource.AssetName)' is missing checksum metadata."
            }

            if ($null -eq (Get-Command -Name Expand-Archive -ErrorAction SilentlyContinue)) {
                throw "Tokki package extraction requires the PowerShell command 'Expand-Archive'. Use Windows PowerShell 5.1 or newer."
            }

            $downloadPath = Join-Path -Path $workingRoot -ChildPath $PackageSource.AssetName
            $checksumPath = Join-Path -Path $workingRoot -ChildPath $PackageSource.ChecksumName
            $headers = @{
                'User-Agent' = 'TokkiInstaller/1.0'
            }
            if (-not [string]::IsNullOrWhiteSpace($GitHubToken)) {
                $headers.Authorization = 'Bearer {0}' -f $GitHubToken
            }

            Invoke-TokkiDownloadFile -Uri $PackageSource.DownloadUrl -DestinationPath $downloadPath -Headers $headers
            Invoke-TokkiDownloadFile -Uri $PackageSource.ChecksumDownloadUrl -DestinationPath $checksumPath -Headers $headers

            $expectedHash = Read-TokkiChecksumFile -ChecksumPath $checksumPath -ExpectedAssetName $PackageSource.AssetName
            $actualHash = Get-TokkiFileSha256 -Path $downloadPath
            if ($actualHash -ne $expectedHash) {
                throw "Checksum mismatch for '$($PackageSource.AssetName)'. Expected $expectedHash but got $actualHash."
            }

            Invoke-TokkiWithRetry -Operation ("Extract package {0}" -f $downloadPath) -MaxAttempts 3 -Action {
                if (Test-Path -LiteralPath $expandedDir -PathType Container) {
                    Remove-Item -LiteralPath $expandedDir -Recurse -Force -ErrorAction Stop
                }

                Expand-Archive -LiteralPath $downloadPath -DestinationPath $expandedDir -Force
            } | Out-Null
            $searchRoot = $expandedDir
            $checksumStatus = 'verified'
            $resolvedChecksumPath = $checksumPath
        }
        else {
            if (Test-Path -LiteralPath $PackageSource.PackagePath -PathType Container) {
                $searchRoot = $PackageSource.PackagePath
                $checksumStatus = 'skipped-local-directory'
            }
            else {
                if (-not ($PackageSource.PackagePath -like '*.zip')) {
                    throw "Package path must point to an extracted folder or a .zip bundle. Received: $($PackageSource.PackagePath)"
                }

                if ([string]::IsNullOrWhiteSpace($PackageSource.ChecksumPath)) {
                    throw "Checksum path is missing for local package '$($PackageSource.PackagePath)'."
                }

                if ($null -eq (Get-Command -Name Expand-Archive -ErrorAction SilentlyContinue)) {
                    throw "Tokki package extraction requires the PowerShell command 'Expand-Archive'. Use Windows PowerShell 5.1 or newer."
                }

                $expectedHash = Read-TokkiChecksumFile -ChecksumPath $PackageSource.ChecksumPath -ExpectedAssetName (Split-Path -Path $PackageSource.PackagePath -Leaf)
                $actualHash = Get-TokkiFileSha256 -Path $PackageSource.PackagePath
                if ($actualHash -ne $expectedHash) {
                    throw "Checksum mismatch for '$($PackageSource.PackagePath)'. Expected $expectedHash but got $actualHash."
                }

                Invoke-TokkiWithRetry -Operation ("Extract package {0}" -f $PackageSource.PackagePath) -MaxAttempts 3 -Action {
                    if (Test-Path -LiteralPath $expandedDir -PathType Container) {
                        Remove-Item -LiteralPath $expandedDir -Recurse -Force -ErrorAction Stop
                    }

                    Expand-Archive -LiteralPath $PackageSource.PackagePath -DestinationPath $expandedDir -Force
                } | Out-Null
                $searchRoot = $expandedDir
                $checksumStatus = 'verified'
                $resolvedChecksumPath = $PackageSource.ChecksumPath
            }
        }

        $payloadRoot = Find-TokkiPayloadRoot -RootPath $searchRoot -ExecutableName $ExecutableName
        $completed = $true

        return [pscustomobject]@{
            PayloadRoot = $payloadRoot
            CleanupPath = if ($ownsWorkingRoot) { $workingRoot } else { $null }
            ChecksumStatus = $checksumStatus
            ChecksumPath = $resolvedChecksumPath
        }
    }
    finally {
        if (-not $completed -and $ownsWorkingRoot -and (Test-Path -LiteralPath $workingRoot)) {
            try {
                Remove-Item -LiteralPath $workingRoot -Recurse -Force -ErrorAction Stop
            }
            catch {
                Write-Verbose "Could not remove temporary directory $workingRoot after failed package expansion: $($_.Exception.Message)"
            }
        }
    }
}

function Get-TokkiDeploymentLogPath {
    param(
        [Parameter(Mandatory = $true)]
        $Paths,
        [Parameter(Mandatory = $true)]
        [string]$Mode,
        [switch]$PlanOnly
    )

    if ($PlanOnly) {
        return $null
    }

    if (-not (Test-Path -LiteralPath $Paths.LogsDir -PathType Container)) {
        [System.IO.Directory]::CreateDirectory($Paths.LogsDir) | Out-Null
    }

    return Join-Path -Path $Paths.LogsDir -ChildPath ('installer-{0}-{1}.log' -f $Mode, [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssfff'))
}

function Write-TokkiDiagnostic {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR')]
        [string]$Level = 'INFO',
        [string]$LogPath
    )

    $entry = '[{0}] [{1}] {2}' -f [DateTime]::UtcNow.ToString('o'), $Level, $Message
    Write-Host $entry

    if (-not [string]::IsNullOrWhiteSpace($LogPath)) {
        try {
            Add-Content -LiteralPath $LogPath -Value $entry -Encoding UTF8
        }
        catch {
            Write-Verbose ("Could not write diagnostics to {0}: {1}" -f $LogPath, $_.Exception.Message)
        }
    }
}

function Invoke-TokkiAction {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Description,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action,
        [switch]$PlanOnly
    )

    if ($PlanOnly) {
        Write-Host ('WhatIf: {0}' -f $Description)
        return
    }

    & $Action
}

function Ensure-TokkiDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [switch]$PlanOnly
    )

    if (Test-Path -LiteralPath $Path -PathType Container) {
        return
    }

    Invoke-TokkiAction -Description ("Create directory {0}" -f $Path) -PlanOnly:$PlanOnly -Action {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Ensure-TokkiDirectories {
    param(
        [Parameter(Mandatory = $true)]
        $Paths,
        [switch]$PlanOnly
    )

    foreach ($path in @($Paths.Root, $Paths.BinDir, $Paths.StateDir, $Paths.LogsDir, $Paths.CacheDir, $Paths.ProgramsDir)) {
        Ensure-TokkiDirectory -Path $path -PlanOnly:$PlanOnly
    }
}

function Get-TokkiNormalizedPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    return ([System.IO.Path]::GetFullPath($Path)).TrimEnd('\')
}

function Normalize-TokkiPathEntry {
    param(
        [string]$PathEntry
    )

    if ([string]::IsNullOrWhiteSpace($PathEntry)) {
        return ''
    }

    $trimmedEntry = $PathEntry.Trim().Trim('"')
    $expandedEntry = [Environment]::ExpandEnvironmentVariables($trimmedEntry)
    if (-not [System.IO.Path]::IsPathRooted($expandedEntry)) {
        return $expandedEntry.TrimEnd('\')
    }

    try {
        return ([System.IO.Path]::GetFullPath($expandedEntry)).TrimEnd('\')
    }
    catch {
        return $expandedEntry.TrimEnd('\')
    }
}

function Assert-TokkiManagedPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$InstallRoot,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    $normalizedRoot = Get-TokkiNormalizedPath -Path $InstallRoot
    $normalizedPath = Get-TokkiNormalizedPath -Path $Path
    if ([string]::Equals($normalizedPath, $normalizedRoot, [System.StringComparison]::InvariantCultureIgnoreCase)) {
        throw "$Label path resolves to install root ($normalizedRoot), refusing the operation to protect user data."
    }

    $rootPrefix = '{0}\' -f $normalizedRoot
    if (-not $normalizedPath.StartsWith($rootPrefix, [System.StringComparison]::InvariantCultureIgnoreCase)) {
        throw "$Label path must stay under install root $normalizedRoot. Resolved path: $normalizedPath"
    }
}

function Get-TokkiStagingDirectoryPrefix {
    param(
        [Parameter(Mandatory = $true)]
        $Paths
    )

    return ('{0}.staging.' -f (Split-Path -Path $Paths.AppDir -Leaf))
}

function Get-TokkiStagingDirectoryPath {
    param(
        [Parameter(Mandatory = $true)]
        $Paths
    )

    return Join-Path -Path $Paths.Root -ChildPath ('{0}{1}' -f (Get-TokkiStagingDirectoryPrefix -Paths $Paths), [Guid]::NewGuid().ToString('N'))
}

function Remove-TokkiStagingDirectory {
    param(
        [Parameter(Mandatory = $true)]
        $Paths,
        [Parameter(Mandatory = $true)]
        [string]$StagingDirectory,
        [string]$LogPath,
        [switch]$PlanOnly
    )

    if (-not (Test-Path -LiteralPath $StagingDirectory -PathType Container)) {
        return
    }

    Assert-TokkiManagedPath -Path $StagingDirectory -InstallRoot $Paths.Root -Label 'Tokki staging directory'
    Invoke-TokkiAction -Description ("Remove staged app directory {0}" -f $StagingDirectory) -PlanOnly:$PlanOnly -Action {
        Remove-Item -LiteralPath $StagingDirectory -Recurse -Force -ErrorAction Stop
    }
    Write-TokkiDiagnostic -Message ("Removed staged app directory: {0}" -f $StagingDirectory) -LogPath $LogPath
}

function Resolve-TokkiPendingAppRecovery {
    param(
        [Parameter(Mandatory = $true)]
        $Paths,
        [string]$LogPath,
        [switch]$PlanOnly
    )

    Assert-TokkiManagedPath -Path $Paths.AppDir -InstallRoot $Paths.Root -Label 'Tokki app directory'
    Assert-TokkiManagedPath -Path $Paths.BackupDir -InstallRoot $Paths.Root -Label 'Tokki backup directory'

    $appExists = Test-Path -LiteralPath $Paths.AppDir -PathType Container
    $backupExists = Test-Path -LiteralPath $Paths.BackupDir -PathType Container

    if ($backupExists -and -not $appExists) {
        Write-TokkiDiagnostic -Level 'WARN' -Message ("Detected interrupted deployment state at {0}. Restoring app from backup {1}." -f $Paths.Root, $Paths.BackupDir) -LogPath $LogPath
        Invoke-TokkiAction -Description ("Restore app directory from backup {0}" -f $Paths.BackupDir) -PlanOnly:$PlanOnly -Action {
            Move-Item -LiteralPath $Paths.BackupDir -Destination $Paths.AppDir -Force
        }
        Write-TokkiDiagnostic -Message ("Recovered app directory from backup: {0}" -f $Paths.AppDir) -LogPath $LogPath
    }

    $stagingPattern = '{0}*' -f (Get-TokkiStagingDirectoryPrefix -Paths $Paths)
    foreach ($stagingDirectory in @(Get-ChildItem -LiteralPath $Paths.Root -Directory -Filter $stagingPattern -ErrorAction SilentlyContinue)) {
        Remove-TokkiStagingDirectory -Paths $Paths -StagingDirectory $stagingDirectory.FullName -LogPath $LogPath -PlanOnly:$PlanOnly
    }
}

function Restore-TokkiBackupApp {
    param(
        [Parameter(Mandatory = $true)]
        $Paths,
        [string]$LogPath,
        [switch]$PlanOnly
    )

    Assert-TokkiManagedPath -Path $Paths.AppDir -InstallRoot $Paths.Root -Label 'Tokki app directory'
    Assert-TokkiManagedPath -Path $Paths.BackupDir -InstallRoot $Paths.Root -Label 'Tokki backup directory'

    if (-not (Test-Path -LiteralPath $Paths.BackupDir -PathType Container)) {
        throw "Rollback failed because backup directory was not found: $($Paths.BackupDir)"
    }

    if (Test-Path -LiteralPath $Paths.AppDir -PathType Container) {
        Invoke-TokkiAction -Description ("Remove failed app directory {0}" -f $Paths.AppDir) -PlanOnly:$PlanOnly -Action {
            Remove-Item -LiteralPath $Paths.AppDir -Recurse -Force -ErrorAction Stop
        }
    }

    Invoke-TokkiAction -Description ("Restore app directory from backup {0}" -f $Paths.BackupDir) -PlanOnly:$PlanOnly -Action {
        Move-Item -LiteralPath $Paths.BackupDir -Destination $Paths.AppDir -Force
    }
    Write-TokkiDiagnostic -Message ("Rollback restored previous app files from {0}" -f $Paths.BackupDir) -LogPath $LogPath
}

function Rollback-TokkiPayloadDeployment {
    param(
        [Parameter(Mandatory = $true)]
        $Paths,
        $DeploymentContext,
        [string]$LogPath,
        [switch]$PlanOnly
    )

    if ($null -eq $DeploymentContext) {
        return $false
    }

    $rollbackApplied = $false
    if ($DeploymentContext.BackupCreated) {
        Write-TokkiDiagnostic -Level 'WARN' -Message 'Applying rollback because deployment did not complete successfully.' -LogPath $LogPath
        Restore-TokkiBackupApp -Paths $Paths -LogPath $LogPath -PlanOnly:$PlanOnly
        $rollbackApplied = $true
    }

    if ($DeploymentContext.PSObject.Properties.Name -contains 'StagingDir' -and -not [string]::IsNullOrWhiteSpace($DeploymentContext.StagingDir)) {
        Remove-TokkiStagingDirectory -Paths $Paths -StagingDirectory $DeploymentContext.StagingDir -LogPath $LogPath -PlanOnly:$PlanOnly
    }

    return $rollbackApplied
}

function Finalize-TokkiPayloadDeployment {
    param(
        [Parameter(Mandatory = $true)]
        $Paths,
        $DeploymentContext,
        [string]$LogPath,
        [switch]$PlanOnly
    )

    if ($null -eq $DeploymentContext) {
        return
    }

    if (
        $DeploymentContext.PSObject.Properties.Name -contains 'StagingDir' -and
        -not [string]::IsNullOrWhiteSpace($DeploymentContext.StagingDir)
    ) {
        Remove-TokkiStagingDirectory -Paths $Paths -StagingDirectory $DeploymentContext.StagingDir -LogPath $LogPath -PlanOnly:$PlanOnly
    }

    if (-not (Test-Path -LiteralPath $Paths.BackupDir -PathType Container)) {
        return
    }

    Assert-TokkiManagedPath -Path $Paths.BackupDir -InstallRoot $Paths.Root -Label 'Tokki backup directory'
    try {
        Invoke-TokkiAction -Description ("Remove backup directory {0}" -f $Paths.BackupDir) -PlanOnly:$PlanOnly -Action {
            Remove-Item -LiteralPath $Paths.BackupDir -Recurse -Force -ErrorAction Stop
        }
        Write-TokkiDiagnostic -Message ("Removed backup directory: {0}" -f $Paths.BackupDir) -LogPath $LogPath
    }
    catch {
        Write-TokkiDiagnostic -Level 'WARN' -Message ("Could not remove backup directory {0}: {1}" -f $Paths.BackupDir, $_.Exception.Message) -LogPath $LogPath
    }
}

function Get-TokkiProcessesForExecutable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ExecutablePath
    )

    if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
        return @()
    }

    $processName = [System.IO.Path]::GetFileNameWithoutExtension($ExecutablePath)
    $matches = New-Object System.Collections.Generic.List[object]
    foreach ($process in @(Get-Process -Name $processName -ErrorAction SilentlyContinue)) {
        $processPath = $null
        try {
            $processPath = $process.Path
        }
        catch {
            $processPath = $null
        }

        if ($processPath -and [string]::Equals($processPath, $ExecutablePath, [System.StringComparison]::InvariantCultureIgnoreCase)) {
            $null = $matches.Add($process)
        }
    }

    return $matches.ToArray()
}

function Stop-TokkiRunningInstance {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ExecutablePath,
        [switch]$PlanOnly
    )

    $matches = @(Get-TokkiProcessesForExecutable -ExecutablePath $ExecutablePath)
    foreach ($match in $matches) {
        $processId = $match.Id
        Invoke-TokkiAction -Description ("Stop Tokki process {0}" -f $processId) -PlanOnly:$PlanOnly -Action {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        }
    }

    return @($matches)
}

function Deploy-TokkiPayload {
    param(
        [Parameter(Mandatory = $true)]
        $Paths,
        [Parameter(Mandatory = $true)]
        [string]$PayloadRoot,
        [string]$LogPath,
        [switch]$PlanOnly
    )

    Assert-TokkiManagedPath -Path $Paths.AppDir -InstallRoot $Paths.Root -Label 'Tokki app directory'
    Assert-TokkiManagedPath -Path $Paths.BackupDir -InstallRoot $Paths.Root -Label 'Tokki backup directory'

    $stagingDir = Get-TokkiStagingDirectoryPath -Paths $Paths
    Assert-TokkiManagedPath -Path $stagingDir -InstallRoot $Paths.Root -Label 'Tokki staging directory'

    $previousAppPresent = Test-Path -LiteralPath $Paths.AppDir -PathType Container
    $backupCreated = $false

    if (Test-Path -LiteralPath $Paths.BackupDir -PathType Container) {
        Invoke-TokkiAction -Description ("Remove previous backup {0}" -f $Paths.BackupDir) -PlanOnly:$PlanOnly -Action {
            Remove-Item -LiteralPath $Paths.BackupDir -Recurse -Force -ErrorAction Stop
        }
        Write-TokkiDiagnostic -Message ("Removed previous backup directory: {0}" -f $Paths.BackupDir) -LogPath $LogPath
    }

    try {
        Invoke-TokkiAction -Description ("Create staged app directory {0}" -f $stagingDir) -PlanOnly:$PlanOnly -Action {
            New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
        }

        Invoke-TokkiAction -Description ("Copy payload from {0} to staged directory {1}" -f $PayloadRoot, $stagingDir) -PlanOnly:$PlanOnly -Action {
            Get-ChildItem -LiteralPath $PayloadRoot -Force | Copy-Item -Destination $stagingDir -Recurse -Force
        }

        if (-not $PlanOnly) {
            $stagedExecutablePath = Join-Path -Path $stagingDir -ChildPath $Paths.ExecutableName
            if (-not (Test-Path -LiteralPath $stagedExecutablePath -PathType Leaf)) {
                throw "Staged payload is missing $($Paths.ExecutableName): $stagedExecutablePath"
            }
        }

        if ($previousAppPresent) {
            Invoke-TokkiAction -Description ("Move existing app files to backup {0}" -f $Paths.BackupDir) -PlanOnly:$PlanOnly -Action {
                Move-Item -LiteralPath $Paths.AppDir -Destination $Paths.BackupDir -Force
            }
            $backupCreated = $true
            Write-TokkiDiagnostic -Message ("Created rollback backup at {0}" -f $Paths.BackupDir) -LogPath $LogPath
        }

        Invoke-TokkiAction -Description ("Atomically promote staged app {0} to {1}" -f $stagingDir, $Paths.AppDir) -PlanOnly:$PlanOnly -Action {
            Move-Item -LiteralPath $stagingDir -Destination $Paths.AppDir -Force
        }

        if (-not $PlanOnly -and -not (Test-Path -LiteralPath $Paths.ExecutablePath -PathType Leaf)) {
            throw "Deployment completed but executable is missing from app directory: $($Paths.ExecutablePath)"
        }
    }
    catch {
        if (-not $PlanOnly -and $backupCreated) {
            try {
                Restore-TokkiBackupApp -Paths $Paths -LogPath $LogPath
            }
            catch {
                Write-TokkiDiagnostic -Level 'ERROR' -Message ("Rollback during payload deploy failed: {0}" -f $_.Exception.Message) -LogPath $LogPath
                throw
            }
        }

        if (-not $PlanOnly) {
            Remove-TokkiStagingDirectory -Paths $Paths -StagingDirectory $stagingDir -LogPath $LogPath
        }

        throw
    }

    Write-TokkiDiagnostic -Message ("App payload promoted via atomic staging directory: {0}" -f $stagingDir) -LogPath $LogPath
    return [pscustomobject]@{
        Strategy = 'atomic-staging-rename'
        StagingDir = $stagingDir
        BackupCreated = [bool]$backupCreated
        PreviousAppPresent = [bool]$previousAppPresent
    }
}

function Copy-TokkiSupportFiles {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        [string]$SourceDirectory,
        [Parameter(Mandatory = $true)]
        [string]$DestinationDirectory,
        [switch]$PlanOnly
    )

    Ensure-TokkiDirectory -Path $DestinationDirectory -PlanOnly:$PlanOnly

    $normalizedSourceDirectory = [System.IO.Path]::GetFullPath($SourceDirectory)
    $normalizedDestinationDirectory = [System.IO.Path]::GetFullPath($DestinationDirectory)

    foreach ($supportFile in @($Config.supportFiles)) {
        $sourcePath = Join-Path -Path $normalizedSourceDirectory -ChildPath $supportFile
        $destinationPath = Join-Path -Path $normalizedDestinationDirectory -ChildPath $supportFile

        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
            throw "Support file missing: $sourcePath"
        }

        if ([string]::Equals($sourcePath, $destinationPath, [System.StringComparison]::InvariantCultureIgnoreCase)) {
            continue
        }

        Invoke-TokkiAction -Description ("Copy support file {0} to {1}" -f $supportFile, $destinationPath) -PlanOnly:$PlanOnly -Action {
            Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
        }
    }

    $wrapperContent = @(
        '@echo off',
        'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Tokki.ps1" %*'
    ) -join [Environment]::NewLine

    Invoke-TokkiAction -Description ("Write command wrapper {0}" -f $DestinationDirectory) -PlanOnly:$PlanOnly -Action {
        Set-Content -LiteralPath (Join-Path -Path $DestinationDirectory -ChildPath 'tokki.cmd') -Value $wrapperContent -Encoding Ascii
    }
}

function Test-TokkiPathEntry {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathEntry
    )

    $expectedPathEntry = Normalize-TokkiPathEntry -PathEntry $PathEntry
    if ([string]::IsNullOrWhiteSpace($expectedPathEntry)) {
        return $false
    }

    $currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ([string]::IsNullOrWhiteSpace($currentPath)) {
        return $false
    }

    foreach ($existing in ($currentPath -split ';')) {
        if ([string]::Equals((Normalize-TokkiPathEntry -PathEntry $existing), $expectedPathEntry, [System.StringComparison]::InvariantCultureIgnoreCase)) {
            return $true
        }
    }

    return $false
}

function Ensure-TokkiUserPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BinDirectory,
        [switch]$PlanOnly
    )

    $normalizedBinDirectory = Normalize-TokkiPathEntry -PathEntry $BinDirectory
    if (Test-TokkiPathEntry -PathEntry $normalizedBinDirectory) {
        return
    }

    $currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $newPath = if ([string]::IsNullOrWhiteSpace($currentPath)) {
        $normalizedBinDirectory
    }
    else {
        '{0};{1}' -f $currentPath.TrimEnd(';'), $normalizedBinDirectory
    }

    Invoke-TokkiAction -Description ("Append {0} to the user PATH" -f $normalizedBinDirectory) -PlanOnly:$PlanOnly -Action {
        [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    }
}

function Normalize-TokkiShortcutValue {
    param(
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ''
    }

    return $Value.Trim()
}

function Test-TokkiShortcutMatches {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ShortcutPath,
        [Parameter(Mandatory = $true)]
        [string]$TargetPath,
        [string]$Arguments,
        [string]$WorkingDirectory
    )

    if (-not (Test-Path -LiteralPath $ShortcutPath -PathType Leaf)) {
        return $false
    }

    try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($ShortcutPath)
    }
    catch {
        return $false
    }

    $actualTarget = Normalize-TokkiShortcutValue -Value $shortcut.TargetPath
    $expectedTarget = Normalize-TokkiShortcutValue -Value $TargetPath
    if (-not [string]::Equals($actualTarget, $expectedTarget, [System.StringComparison]::InvariantCultureIgnoreCase)) {
        return $false
    }

    $actualArguments = Normalize-TokkiShortcutValue -Value $shortcut.Arguments
    $expectedArguments = Normalize-TokkiShortcutValue -Value $Arguments
    if (-not [string]::Equals($actualArguments, $expectedArguments, [System.StringComparison]::Ordinal)) {
        return $false
    }

    $actualWorkingDirectory = Normalize-TokkiShortcutValue -Value $shortcut.WorkingDirectory
    $expectedWorkingDirectory = Normalize-TokkiShortcutValue -Value $WorkingDirectory
    if (-not [string]::Equals($actualWorkingDirectory, $expectedWorkingDirectory, [System.StringComparison]::InvariantCultureIgnoreCase)) {
        return $false
    }

    return $true
}

function New-TokkiShortcutFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ShortcutPath,
        [Parameter(Mandatory = $true)]
        [string]$TargetPath,
        [string]$Arguments,
        [string]$WorkingDirectory,
        [string]$Description,
        [string]$IconLocation,
        [switch]$PlanOnly
    )

    if (Test-TokkiShortcutMatches -ShortcutPath $ShortcutPath -TargetPath $TargetPath -Arguments $Arguments -WorkingDirectory $WorkingDirectory) {
        return
    }

    Invoke-TokkiAction -Description ("Create shortcut {0}" -f $ShortcutPath) -PlanOnly:$PlanOnly -Action {
        Invoke-TokkiWithRetry -Operation ("Create shortcut {0}" -f $ShortcutPath) -MaxAttempts 3 -Action {
            $shell = New-Object -ComObject WScript.Shell
            $shortcut = $shell.CreateShortcut($ShortcutPath)
            $shortcut.TargetPath = $TargetPath
            $shortcut.Arguments = if ([string]::IsNullOrWhiteSpace($Arguments)) { '' } else { $Arguments }
            $shortcut.WorkingDirectory = if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) { '' } else { $WorkingDirectory }

            if (-not [string]::IsNullOrWhiteSpace($Description)) {
                $shortcut.Description = $Description
            }

            if (-not [string]::IsNullOrWhiteSpace($IconLocation)) {
                $shortcut.IconLocation = $IconLocation
            }

            $shortcut.Save()

            if (-not (Test-TokkiShortcutMatches -ShortcutPath $ShortcutPath -TargetPath $TargetPath -Arguments $Arguments -WorkingDirectory $WorkingDirectory)) {
                throw "Shortcut verification failed for $ShortcutPath."
            }
        } | Out-Null
    }
}

function Ensure-TokkiShortcuts {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        $Paths,
        [switch]$PlanOnly
    )

    if (-not $PlanOnly -and -not (Test-Path -LiteralPath $Paths.ExecutablePath -PathType Leaf)) {
        throw "Cannot create Start Menu shortcut because Tokki executable was not found: $($Paths.ExecutablePath)"
    }

    if (-not $PlanOnly -and -not (Test-Path -LiteralPath $Paths.DispatcherPath -PathType Leaf)) {
        throw "Cannot create update shortcut because dispatcher script was not found: $($Paths.DispatcherPath)"
    }

    Ensure-TokkiDirectory -Path $Paths.ProgramsDir -PlanOnly:$PlanOnly

    New-TokkiShortcutFile -ShortcutPath $Paths.ShortcutPath -TargetPath $Paths.ExecutablePath -WorkingDirectory $Paths.AppDir -Description 'Launch Tokki' -IconLocation $Paths.ExecutablePath -PlanOnly:$PlanOnly

    $powershellExe = Join-Path -Path $env:SystemRoot -ChildPath 'System32\WindowsPowerShell\v1.0\powershell.exe'
    if (-not $PlanOnly -and -not (Test-Path -LiteralPath $powershellExe -PathType Leaf)) {
        throw "Cannot create update shortcut because PowerShell executable was not found: $powershellExe"
    }

    $arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" update' -f $Paths.DispatcherPath
    New-TokkiShortcutFile -ShortcutPath $Paths.UpdateShortcutPath -TargetPath $powershellExe -Arguments $arguments -WorkingDirectory $Paths.BinDir -Description 'Update Tokki' -IconLocation $Paths.ExecutablePath -PlanOnly:$PlanOnly
}

function Get-TokkiInstallState {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StatePath
    )

    if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) {
        return $null
    }

    return (Get-Content -LiteralPath $StatePath -Raw -ErrorAction Stop | ConvertFrom-Json)
}

function Save-TokkiInstallState {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StatePath,
        [Parameter(Mandatory = $true)]
        $RepositoryInfo,
        [Parameter(Mandatory = $true)]
        $PackageSource,
        [Parameter(Mandatory = $true)]
        $Paths,
        [string]$ExistingInstalledAtUtc,
        [switch]$PlanOnly
    )

    $timestamp = [DateTime]::UtcNow.ToString('o')
    $state = [ordered]@{
        schemaVersion = 1
        repository = $RepositoryInfo.FullName
        tag = $PackageSource.Tag
        version = $PackageSource.Version
        assetName = $PackageSource.AssetName
        source = $PackageSource.Mode
        installedAtUtc = if ([string]::IsNullOrWhiteSpace($ExistingInstalledAtUtc)) { $timestamp } else { $ExistingInstalledAtUtc }
        lastUpdatedAtUtc = $timestamp
        installRoot = $Paths.Root
        appDir = $Paths.AppDir
        binDir = $Paths.BinDir
        executablePath = $Paths.ExecutablePath
        dataRoot = $Paths.Root
        dataPreserved = $true
    }

    $json = $state | ConvertTo-Json -Depth 6
    Invoke-TokkiAction -Description ("Write install state to {0}" -f $StatePath) -PlanOnly:$PlanOnly -Action {
        Set-Content -LiteralPath $StatePath -Value $json -Encoding UTF8
    }

    return [pscustomobject]$state
}

function Start-TokkiInstalledApplication {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ConfigPath,
        [string]$InstallRoot,
        [switch]$PlanOnly
    )

    $config = Read-TokkiConfiguration -ConfigPath $ConfigPath
    $paths = Get-TokkiInstallLayout -Config $config -InstallRoot $InstallRoot

    if (-not (Test-Path -LiteralPath $paths.ExecutablePath -PathType Leaf) -and -not $PlanOnly) {
        throw "Tokki executable not found at $($paths.ExecutablePath). Run install first."
    }

    if ($PlanOnly) {
        Write-Host ('WhatIf: Launch Tokki from {0}' -f $paths.ExecutablePath)
        return [pscustomobject]@{
            launched = $false
            reason = 'dry-run'
            executablePath = $paths.ExecutablePath
            processId = $null
        }
    }

    $runningProcesses = @(Get-TokkiProcessesForExecutable -ExecutablePath $paths.ExecutablePath)
    if ($runningProcesses.Count -gt 0) {
        return [pscustomobject]@{
            launched = $false
            reason = 'already-running'
            executablePath = $paths.ExecutablePath
            processId = $runningProcesses[0].Id
            processIds = @($runningProcesses | ForEach-Object { $_.Id })
        }
    }

    $process = Start-Process -FilePath $paths.ExecutablePath -WorkingDirectory $paths.AppDir -PassThru -ErrorAction Stop
    Start-Sleep -Milliseconds 300
    try {
        $process.Refresh()
    }
    catch {
        # Best effort, Start-Process already succeeded.
    }

    if ($process.HasExited) {
        throw "Tokki launch failed because process $($process.Id) exited immediately with code $($process.ExitCode)."
    }

    return [pscustomobject]@{
        launched = $true
        reason = 'started'
        executablePath = $paths.ExecutablePath
        processId = $process.Id
    }
}

function Show-TokkiStatus {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ConfigPath,
        [string]$Repository,
        [string]$InstallRoot
    )

    $config = Read-TokkiConfiguration -ConfigPath $ConfigPath
    $repositoryInfo = Get-TokkiRepositoryInfo -Config $config -Repository $Repository
    $paths = Get-TokkiInstallLayout -Config $config -InstallRoot $InstallRoot
    $state = Get-TokkiInstallState -StatePath $paths.StatePath
    $appExists = Test-Path -LiteralPath $paths.AppDir -PathType Container
    $backupExists = Test-Path -LiteralPath $paths.BackupDir -PathType Container
    $stagingPattern = '{0}*' -f (Get-TokkiStagingDirectoryPrefix -Paths $paths)
    $stagedDirectories = @(
        Get-ChildItem -LiteralPath $paths.Root -Directory -Filter $stagingPattern -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty FullName
    )

    return [pscustomobject]@{
        repository = $repositoryInfo.FullName
        installed = ($null -ne $state)
        installRoot = $paths.Root
        appDir = $paths.AppDir
        appDirExists = $appExists
        backupDir = $paths.BackupDir
        backupDirExists = $backupExists
        backupRecoveryPending = ($backupExists -and -not $appExists)
        stagedAppDirectories = $stagedDirectories
        binDir = $paths.BinDir
        executablePath = $paths.ExecutablePath
        statePath = $paths.StatePath
        startMenuShortcut = $paths.ShortcutPath
        updateShortcut = $paths.UpdateShortcutPath
        pathRegistered = (Test-TokkiPathEntry -PathEntry $paths.BinDir)
        installedTag = if ($null -ne $state) { $state.tag } else { $null }
        installedVersion = if ($null -ne $state) { $state.version } else { $null }
        dataPreservedOnUpdate = $true
        dataRoot = $paths.Root
    }
}

function Invoke-TokkiDeployment {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('install', 'update')]
        [string]$Mode,
        [Parameter(Mandatory = $true)]
        [string]$ConfigPath,
        [string]$Repository,
        [string]$Tag,
        [string]$InstallRoot,
        [string]$PackagePath,
        [string]$AssetName,
        [string]$AssetPattern,
        [string]$GitHubToken,
        [string]$SupportScriptsPath,
        [switch]$Force,
        [switch]$NoLaunch,
        [switch]$NoShortcut,
        [switch]$NoPathUpdate,
        [switch]$PlanOnly
    )

    $config = Read-TokkiConfiguration -ConfigPath $ConfigPath
    $repositoryInfo = Get-TokkiRepositoryInfo -Config $config -Repository $Repository
    $paths = Get-TokkiInstallLayout -Config $config -InstallRoot $InstallRoot
    $existingState = Get-TokkiInstallState -StatePath $paths.StatePath
    $deploymentLogPath = Get-TokkiDeploymentLogPath -Paths $paths -Mode $Mode -PlanOnly:$PlanOnly

    Write-TokkiDiagnostic -Message ("Tokki {0} root: {1}" -f $Mode, $paths.Root) -LogPath $deploymentLogPath
    Write-TokkiDiagnostic -Message ("Tokki user data stays in: {0}" -f $paths.Root) -LogPath $deploymentLogPath
    Write-TokkiDiagnostic -Message ("Only app files under {0} are replaced; files directly under {1} are preserved as user data." -f $paths.AppDir, $paths.Root) -LogPath $deploymentLogPath
    if (-not [string]::IsNullOrWhiteSpace($deploymentLogPath)) {
        Write-TokkiDiagnostic -Message ("Installer diagnostics log: {0}" -f $deploymentLogPath) -LogPath $deploymentLogPath
    }

    if ($Mode -eq 'update' -and $null -eq $existingState -and -not $PlanOnly) {
        throw "Tokki is not installed at $($paths.Root). Run the installer first."
    }

    $expandedPackage = $null
    $payloadDeployment = $null
    $launchResult = $null
    $rollbackApplied = $false
    $stateFileSnapshot = $null
    $stateFileExisted = $false
    if (-not $PlanOnly -and (Test-Path -LiteralPath $paths.StatePath -PathType Leaf)) {
        $stateFileSnapshot = Get-Content -LiteralPath $paths.StatePath -Raw -ErrorAction Stop
        $stateFileExisted = $true
    }

    try {
        Ensure-TokkiDirectories -Paths $paths -PlanOnly:$PlanOnly
        Resolve-TokkiPendingAppRecovery -Paths $paths -LogPath $deploymentLogPath -PlanOnly:$PlanOnly

        $packageSource = Get-TokkiPackageSource -Config $config -RepositoryInfo $repositoryInfo -Tag $Tag -PackagePath $PackagePath -AssetName $AssetName -AssetPattern $AssetPattern -GitHubToken $GitHubToken -PlanOnly:$PlanOnly
        Write-TokkiDiagnostic -Message ("Package source: mode={0}; descriptor={1}; asset={2}; checksum={3}" -f $packageSource.Mode, $packageSource.Descriptor, $packageSource.AssetName, $packageSource.ChecksumStatus) -LogPath $deploymentLogPath

        if (-not $Force -and $null -ne $existingState -and -not [string]::IsNullOrWhiteSpace($existingState.tag) -and $existingState.tag -eq $packageSource.Tag) {
            Write-TokkiDiagnostic -Message ('Tokki {0} is already installed. Use -Force to {1} the same version.' -f $packageSource.Tag, $Mode) -LogPath $deploymentLogPath
            return [pscustomobject]@{
                mode = $Mode
                skipped = $true
                reason = 'same-version'
                version = $existingState.version
                tag = $existingState.tag
                installRoot = $paths.Root
                dryRun = [bool]$PlanOnly
                logPath = $deploymentLogPath
            }
        }

        $expandedPackage = Expand-TokkiPackageSource -PackageSource $packageSource -ExecutableName $paths.ExecutableName -GitHubToken $GitHubToken
        Write-TokkiDiagnostic -Message ("Package checksum status: {0}" -f $expandedPackage.ChecksumStatus) -LogPath $deploymentLogPath

        $stoppedProcesses = @(Stop-TokkiRunningInstance -ExecutablePath $paths.ExecutablePath -PlanOnly:$PlanOnly)
        if ($stoppedProcesses.Count -gt 0) {
            Write-TokkiDiagnostic -Message ("Stopped existing Tokki processes: {0}" -f (($stoppedProcesses | ForEach-Object { $_.Id }) -join ', ')) -LogPath $deploymentLogPath
        }

        $payloadDeployment = Deploy-TokkiPayload -Paths $paths -PayloadRoot $expandedPackage.PayloadRoot -LogPath $deploymentLogPath -PlanOnly:$PlanOnly
        Write-TokkiDiagnostic -Message ("Deployment strategy: {0}; backupCreated={1}" -f $payloadDeployment.Strategy, $payloadDeployment.BackupCreated) -LogPath $deploymentLogPath

        if (-not [string]::IsNullOrWhiteSpace($SupportScriptsPath)) {
            Copy-TokkiSupportFiles -Config $config -SourceDirectory $SupportScriptsPath -DestinationDirectory $paths.BinDir -PlanOnly:$PlanOnly
            Write-TokkiDiagnostic -Message ("Support scripts refreshed in {0}" -f $paths.BinDir) -LogPath $deploymentLogPath
        }

        if (-not $NoPathUpdate) {
            Ensure-TokkiUserPath -BinDirectory $paths.BinDir -PlanOnly:$PlanOnly
            Write-TokkiDiagnostic -Message ("Verified PATH entry for {0}" -f $paths.BinDir) -LogPath $deploymentLogPath
        }
        else {
            Write-TokkiDiagnostic -Message 'Skipped PATH update because -NoPathUpdate was specified.' -LogPath $deploymentLogPath
        }

        if (-not $NoShortcut) {
            Ensure-TokkiShortcuts -Config $config -Paths $paths -PlanOnly:$PlanOnly
            Write-TokkiDiagnostic -Message ("Verified Start Menu shortcuts under {0}" -f $paths.ProgramsDir) -LogPath $deploymentLogPath
        }
        else {
            Write-TokkiDiagnostic -Message 'Skipped shortcut creation because -NoShortcut was specified.' -LogPath $deploymentLogPath
        }

        $existingInstalledAt = $null
        if ($null -ne $existingState) {
            $existingInstalledAt = $existingState.installedAtUtc
        }

        if (-not $NoLaunch) {
            $launchResult = Start-TokkiInstalledApplication -ConfigPath $ConfigPath -InstallRoot $paths.Root -PlanOnly:$PlanOnly
            Write-TokkiDiagnostic -Message ("Launch result: {0}" -f $launchResult.reason) -LogPath $deploymentLogPath
        }
        else {
            Write-TokkiDiagnostic -Message 'Skipped launch because -NoLaunch was specified.' -LogPath $deploymentLogPath
        }

        $state = Save-TokkiInstallState -StatePath $paths.StatePath -RepositoryInfo $repositoryInfo -PackageSource $packageSource -Paths $paths -ExistingInstalledAtUtc $existingInstalledAt -PlanOnly:$PlanOnly
        Write-TokkiDiagnostic -Message ("Install state updated at {0}" -f $paths.StatePath) -LogPath $deploymentLogPath
        Finalize-TokkiPayloadDeployment -Paths $paths -DeploymentContext $payloadDeployment -LogPath $deploymentLogPath -PlanOnly:$PlanOnly

        $result = [pscustomobject]@{
            mode = $Mode
            skipped = $false
            tag = $state.tag
            version = $state.version
            installRoot = $paths.Root
            executablePath = $paths.ExecutablePath
            dataRoot = $paths.Root
            dataPreserved = $true
            checksumStatus = $expandedPackage.ChecksumStatus
            checksumPath = $expandedPackage.ChecksumPath
            sourceMode = $packageSource.Mode
            deploymentStrategy = if ($null -ne $payloadDeployment) { $payloadDeployment.Strategy } else { $null }
            backupPath = $paths.BackupDir
            dryRun = [bool]$PlanOnly
            launched = if ($null -ne $launchResult) { [bool]$launchResult.launched } else { $false }
            launchReason = if ($null -ne $launchResult) { $launchResult.reason } else { if ($NoLaunch) { 'disabled' } else { 'not-requested' } }
            launchProcessId = if ($null -ne $launchResult) { $launchResult.processId } else { $null }
            rollbackApplied = $false
            logPath = $deploymentLogPath
        }

        Write-TokkiDiagnostic -Message ("Tokki {0} completed for version {1}." -f $Mode, $result.version) -LogPath $deploymentLogPath
        return $result
    }
    catch {
        $errorSummary = Get-TokkiErrorMessage -Exception $_.Exception
        try {
            if ($null -ne $payloadDeployment) {
                $rollbackApplied = Rollback-TokkiPayloadDeployment -Paths $paths -DeploymentContext $payloadDeployment -LogPath $deploymentLogPath -PlanOnly:$PlanOnly
                if ($rollbackApplied -and -not $PlanOnly) {
                    if ($stateFileExisted) {
                        Set-Content -LiteralPath $paths.StatePath -Value $stateFileSnapshot -Encoding UTF8
                        Write-TokkiDiagnostic -Message ("Restored prior install state at {0}" -f $paths.StatePath) -LogPath $deploymentLogPath
                    }
                    elseif (Test-Path -LiteralPath $paths.StatePath -PathType Leaf) {
                        Remove-Item -LiteralPath $paths.StatePath -Force -ErrorAction SilentlyContinue
                        Write-TokkiDiagnostic -Message ("Removed install state written during failed deployment: {0}" -f $paths.StatePath) -LogPath $deploymentLogPath
                    }
                }
            }
        }
        catch {
            Write-TokkiDiagnostic -Level 'ERROR' -Message ("Rollback handling failed: {0}" -f $_.Exception.Message) -LogPath $deploymentLogPath
            $errorSummary = '{0} | Rollback handling failed: {1}' -f $errorSummary, $_.Exception.Message
        }

        if ($rollbackApplied) {
            Write-TokkiDiagnostic -Level 'WARN' -Message 'Rollback completed; previous app version restored.' -LogPath $deploymentLogPath
        }

        Write-TokkiDiagnostic -Level 'ERROR' -Message ("Tokki {0} failed. {1}" -f $Mode, $errorSummary) -LogPath $deploymentLogPath
        if (-not [string]::IsNullOrWhiteSpace($deploymentLogPath)) {
            throw "Tokki $Mode failed. $errorSummary See installer log: $deploymentLogPath"
        }

        throw "Tokki $Mode failed. $errorSummary"
    }
    finally {
        if ($null -ne $expandedPackage -and -not [string]::IsNullOrWhiteSpace($expandedPackage.CleanupPath) -and (Test-Path -LiteralPath $expandedPackage.CleanupPath)) {
            try {
                Remove-Item -LiteralPath $expandedPackage.CleanupPath -Recurse -Force -ErrorAction Stop
            }
            catch {
                Write-Verbose "Could not remove temporary directory $($expandedPackage.CleanupPath): $($_.Exception.Message)"
            }
        }
    }
}

function Invoke-TokkiInstall {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ConfigPath,
        [string]$Repository,
        [string]$Tag,
        [string]$InstallRoot,
        [string]$PackagePath,
        [string]$AssetName,
        [string]$AssetPattern,
        [string]$GitHubToken,
        [string]$SupportScriptsPath,
        [switch]$Force,
        [switch]$NoLaunch,
        [switch]$NoShortcut,
        [switch]$NoPathUpdate,
        [switch]$PlanOnly
    )

    return Invoke-TokkiDeployment -Mode 'install' -ConfigPath $ConfigPath -Repository $Repository -Tag $Tag -InstallRoot $InstallRoot -PackagePath $PackagePath -AssetName $AssetName -AssetPattern $AssetPattern -GitHubToken $GitHubToken -SupportScriptsPath $SupportScriptsPath -Force:$Force -NoLaunch:$NoLaunch -NoShortcut:$NoShortcut -NoPathUpdate:$NoPathUpdate -PlanOnly:$PlanOnly
}

function Invoke-TokkiUpdate {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ConfigPath,
        [string]$Repository,
        [string]$Tag,
        [string]$InstallRoot,
        [string]$PackagePath,
        [string]$AssetName,
        [string]$AssetPattern,
        [string]$GitHubToken,
        [string]$SupportScriptsPath,
        [switch]$Force,
        [switch]$NoLaunch,
        [switch]$NoShortcut,
        [switch]$NoPathUpdate,
        [switch]$PlanOnly
    )

    return Invoke-TokkiDeployment -Mode 'update' -ConfigPath $ConfigPath -Repository $Repository -Tag $Tag -InstallRoot $InstallRoot -PackagePath $PackagePath -AssetName $AssetName -AssetPattern $AssetPattern -GitHubToken $GitHubToken -SupportScriptsPath $SupportScriptsPath -Force:$Force -NoLaunch:$NoLaunch -NoShortcut:$NoShortcut -NoPathUpdate:$NoPathUpdate -PlanOnly:$PlanOnly
}

Export-ModuleMember -Function Invoke-TokkiInstall, Invoke-TokkiUpdate, Show-TokkiStatus, Start-TokkiInstalledApplication
