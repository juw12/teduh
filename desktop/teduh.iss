; Teduh for Windows - per-user installer (no admin rights). build.py compiles it with:
;   iscc /DAppVersion=1.0.0 /DSourceDir=<dist\Teduh> /DOutputDir=<dist> /DIconFile=<build\teduh.ico> teduh.iss
; Installs to %LOCALAPPDATA%\Programs\Teduh, adds Teduh to the Start menu (and optionally the desktop) and lists it
; in Settings > Apps. The window keeps its data (your saved village and settings) in %LOCALAPPDATA%\Teduh, which
; uninstalling leaves in place so a reinstall finds it again.

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif
#ifndef SourceDir
  #define SourceDir "dist\Teduh"
#endif
#ifndef OutputDir
  #define OutputDir "dist"
#endif
#ifndef IconFile
  #define IconFile "build\teduh.ico"
#endif

[Setup]
AppId={{F1D21177-6CCE-5510-82FF-4E5237FFF153}
AppName=Teduh
AppVersion={#AppVersion}
AppVerName=Teduh {#AppVersion}
AppPublisher=Juwen Lie
AppPublisherURL=https://juw12.github.io/teduh/
AppSupportURL=https://github.com/juw12/teduh
DefaultDirName={autopf}\Teduh
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir={#OutputDir}
OutputBaseFilename=Teduh-Windows-Setup
SetupIconFile={#IconFile}
UninstallDisplayIcon={app}\Teduh.exe
UninstallDisplayName=Teduh
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=no
SetupLogging=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{userprograms}\Teduh"; Filename: "{app}\Teduh.exe"; Comment: "A calm sky village you build with sun, wind and friends"
Name: "{userdesktop}\Teduh"; Filename: "{app}\Teduh.exe"; Comment: "A calm sky village you build with sun, wind and friends"; Tasks: desktopicon

[Run]
Filename: "{app}\Teduh.exe"; Description: "{cm:LaunchProgram,Teduh}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\Teduh.exe"; Parameters: "--stop"; Flags: runhidden waituntilterminated; RunOnceId: "StopTeduh"

[Code]
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  Result := '';
  { Updating: close an open Teduh window first so its files can be replaced. }
  if FileExists(ExpandConstant('{app}\Teduh.exe')) then
    Exec(ExpandConstant('{app}\Teduh.exe'), '--stop', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;
