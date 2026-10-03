$ErrorActionPreference = 'Stop'
$tag = $env:GITHUB_REF_NAME
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
$publishing = $env:GITHUB_EVENT_NAME -eq 'push' -or ($env:GITHUB_EVENT_NAME -eq 'workflow_dispatch' -and $env:PROMPTLY_PUBLISH_RELEASE -eq 'true')
if ($tag -cne "v$version" -or -not $publishing) { throw 'Publication requires an exact version tag and publication enabled.' }
$directory = "out/staged/Promptly-$version-signed-win32-x64"
$artifacts = @(Get-ChildItem -LiteralPath $directory -File | ForEach-Object { $_.FullName })
if ($artifacts.Count -ne 6) { throw 'Expected Setup, nupkg, RELEASES, README, BUILD and checksums.' }
# Upload into a draft first so /releases/latest never exposes an incomplete update feed.
gh release view $tag --json isDraft --jq '.isDraft' 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { throw 'Release already exists; refusing to replace published or draft artifacts.' }
gh release create $tag --verify-tag --draft --title "Promptly $tag" --generate-notes @artifacts
if ($LASTEXITCODE -ne 0) { throw 'Release upload failed. Any draft can be inspected before retrying.' }
gh release edit $tag --draft=false --latest
if ($LASTEXITCODE -ne 0) { throw 'Publishing failed; release remains available for inspection.' }
