$ErrorActionPreference = 'Stop'
$frameworkRoot = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
$compilerPath = Join-Path $frameworkRoot 'csc.exe'
$outputDirectory = Join-Path $PSScriptRoot 'out'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$references = @('System.Web.Extensions.dll', 'WPF/UIAutomationClient.dll', 'WPF/UIAutomationTypes.dll', 'WPF/WindowsBase.dll') |
  ForEach-Object { '/reference:' + (Join-Path $frameworkRoot $_) }
$sources = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.cs' | ForEach-Object { $_.FullName }
& $compilerPath /nologo /warnaserror+ /target:exe /platform:anycpu ('/out:' + (Join-Path $outputDirectory 'promptly-windows.exe')) @references @sources
if ($LASTEXITCODE -ne 0) { throw 'Production Windows helper compilation failed' }
