$ErrorActionPreference = 'Stop'

foreach ($name in @('AZURE_SIGNING_ENDPOINT', 'AZURE_SIGNING_ACCOUNT', 'AZURE_SIGNING_PROFILE', 'RUNNER_TEMP', 'GITHUB_ENV')) {
    if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Missing $name" }
}

$signingDirectory = Join-Path $env:RUNNER_TEMP 'promptly-signing'
New-Item -ItemType Directory -Path $signingDirectory -Force | Out-Null
$clientArchive = Join-Path $signingDirectory 'client.zip'
Invoke-WebRequest 'https://api.nuget.org/v3-flatcontainer/microsoft.artifactsigning.client/1.0.128/microsoft.artifactsigning.client.1.0.128.nupkg' -OutFile $clientArchive
Expand-Archive -LiteralPath $clientArchive -DestinationPath (Join-Path $signingDirectory 'client') -Force
$dlib = Get-ChildItem (Join-Path $signingDirectory 'client') -Recurse -Filter Azure.CodeSigning.Dlib.dll |
    Where-Object { $_.Directory.Name -eq 'x64' } | Select-Object -First 1
$sdkDirectory = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits/10/bin'
$signTool = Get-ChildItem $sdkDirectory -Directory | Where-Object { $_.Name -match '^10\.0\.\d+\.0$' } |
    Sort-Object { [version]$_.Name } -Descending | ForEach-Object { Join-Path $_.FullName 'x64/signtool.exe' } |
    Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $dlib -or -not $signTool) { throw 'Artifact Signing client or Windows SDK SignTool missing.' }

$metadataPath = Join-Path $signingDirectory 'metadata.json'
@{
    Endpoint = $env:AZURE_SIGNING_ENDPOINT
    CodeSigningAccountName = $env:AZURE_SIGNING_ACCOUNT
    CertificateProfileName = $env:AZURE_SIGNING_PROFILE
    ExcludeCredentials = @('EnvironmentCredential', 'WorkloadIdentityCredential', 'ManagedIdentityCredential',
        'SharedTokenCacheCredential', 'VisualStudioCredential', 'VisualStudioCodeCredential',
        'AzurePowerShellCredential', 'AzureDeveloperCliCredential', 'InteractiveBrowserCredential')
} | ConvertTo-Json | Set-Content -LiteralPath $metadataPath -Encoding utf8
"SIGNTOOL_PATH=$signTool" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
"AZURE_CODE_SIGNING_DLIB=$($dlib.FullName)" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
"AZURE_METADATA_JSON=$metadataPath" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
