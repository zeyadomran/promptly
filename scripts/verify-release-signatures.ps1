$ErrorActionPreference = 'Stop'
$output = (Resolve-Path 'out/make/squirrel.windows/x64').Path
$packages = @(Get-ChildItem -LiteralPath $output -Filter '*-full.nupkg')
if ($packages.Count -ne 1) { throw 'Expected exactly one full update package.' }
$extracted = Join-Path ([IO.Path]::GetTempPath()) ('promptly-signatures-' + [guid]::NewGuid())
[IO.Compression.ZipFile]::ExtractToDirectory($packages[0].FullName, $extracted)
try {
    $payload = Join-Path $extracted 'lib/net45'
    foreach ($required in @('Promptly.exe', 'squirrel.exe', 'resources/promptly-windows.exe', 'resources/promptly-keyboard.exe')) {
        if (-not (Test-Path -LiteralPath (Join-Path $payload $required))) { throw "Missing signed payload: $required" }
    }
    $files = @(Get-ChildItem -LiteralPath $payload -Recurse -File | Where-Object { $_.Extension -in @('.exe', '.dll', '.node') })
    $files += Get-Item -LiteralPath (Join-Path $output 'Promptly-x64-Setup.exe')
    $publisher = (Get-AuthenticodeSignature -LiteralPath (Join-Path $payload 'Promptly.exe')).SignerCertificate.Subject
    if (-not $publisher) { throw 'Missing app publisher.' }
    foreach ($file in $files) {
        $signature = Get-AuthenticodeSignature -LiteralPath $file.FullName
        if ($signature.Status -ne 'Valid' -or -not $signature.TimeStamperCertificate) {
            throw "Invalid or untimestamped signature: $($file.Name) ($($signature.Status))"
        }
        if ($signature.SignerCertificate.Subject -ne $publisher) { throw "Unexpected publisher: $($file.Name)" }
    }
    Write-Output "Verified $($files.Count) timestamped signatures in installer and update payload."
} finally {
    $resolved = [IO.Path]::GetFullPath($extracted)
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if (-not $resolved.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or
        -not ([IO.Path]::GetFileName($resolved)).StartsWith('promptly-signatures-')) { throw 'Unsafe cleanup path.' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
