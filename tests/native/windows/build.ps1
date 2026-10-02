$ErrorActionPreference = 'Stop'
$frameworkRoot = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
$outputDirectory = Join-Path $PSScriptRoot 'out'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$references = @('System.Xaml.dll', 'WPF/UIAutomationClient.dll', 'WPF/UIAutomationTypes.dll', 'WPF/UIAutomationProvider.dll',
  'WPF/WindowsBase.dll', 'WPF/PresentationCore.dll', 'WPF/PresentationFramework.dll') |
  ForEach-Object { '/reference:' + (Join-Path $frameworkRoot $_) }
$sources = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.cs' | ForEach-Object { $_.FullName }
$sources += Join-Path $PSScriptRoot '../../../native/windows/ProcessAccess.cs'
& (Join-Path $frameworkRoot 'csc.exe') /nologo /warnaserror+ /target:exe /platform:anycpu /main:Fixture ('/out:' + (Join-Path $outputDirectory 'fixture.exe')) @references @sources
if ($LASTEXITCODE -ne 0) { throw 'Owned Windows fixture compilation failed' }
& (Join-Path $frameworkRoot 'csc.exe') /nologo /warnaserror+ /target:exe /platform:anycpu /main:AccessPolicy ('/out:' + (Join-Path $outputDirectory 'access-policy.exe')) @references @sources
if ($LASTEXITCODE -ne 0) { throw 'Windows access policy compilation failed' }
