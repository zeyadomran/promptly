$ErrorActionPreference = 'Stop'
$compilerPath = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$outputDirectory = Join-Path $PSScriptRoot 'out'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$sources = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.cs' | ForEach-Object { $_.FullName }
& $compilerPath /nologo /warnaserror+ /target:exe /platform:anycpu ('/out:' + (Join-Path $outputDirectory 'promptly-keyboard.exe')) @sources
if ($LASTEXITCODE -ne 0) { throw 'Keyboard helper compilation failed' }
