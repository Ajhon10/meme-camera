$ErrorActionPreference = 'Stop'
$location = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (!$location) { throw 'Install Visual Studio Build Tools with C++ tools, CMake, and Windows 11 SDK 26100.' }
$cmake = Join-Path $location 'Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe'
& $cmake -S native -B native/build -G 'Visual Studio 17 2022' -A x64
if ($LASTEXITCODE) { exit $LASTEXITCODE }
& $cmake --build native/build --config Release
exit $LASTEXITCODE
