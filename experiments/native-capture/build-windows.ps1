$ErrorActionPreference = 'Stop'
$experimentRoot = $PSScriptRoot
$frameworkRoot = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319'
$compilerPath = Join-Path $frameworkRoot 'csc.exe'
$outputDirectory = Join-Path $experimentRoot 'out'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$references = @('System.Web.Extensions.dll', 'System.Windows.Forms.dll', 'System.Xaml.dll', 'WPF/UIAutomationClient.dll',
  'WPF/UIAutomationTypes.dll', 'WPF/WindowsBase.dll', 'WPF/PresentationCore.dll', 'WPF/PresentationFramework.dll') |
  ForEach-Object { '/reference:' + (Join-Path $frameworkRoot $_) }
$sources = Get-ChildItem -LiteralPath (Join-Path $experimentRoot 'windows') -Filter '*.cs' |
  ForEach-Object { $_.FullName }
& $compilerPath /nologo /warnaserror+ /target:exe /platform:anycpu ('/out:' + (Join-Path $outputDirectory 'promptly-native.exe')) @references @sources
if ($LASTEXITCODE -ne 0) { throw 'Native helper compilation failed' }
