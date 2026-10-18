; Zombie City for Windows: the installer (ZombieCity-Setup.exe). Built by desktop/build_setup.py with NSIS.
; Double-click it and it installs the Zombie City Launcher for this Windows user (no admin rights needed), adds it to
; the Start menu, offers a desktop shortcut, and can start the game when it's done. It also adds an uninstaller to
; Windows Settings > Apps. Uninstalling leaves your saves and settings alone.
; Defines passed in: VERSION (1.9.90), SRC (the "Zombie City" folder), OUT (the setup .exe to write)
Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 32
RequestExecutionLevel user
ManifestDPIAware true

!define APP "Zombie City"
!define EXE "Zombie City Launcher.exe"
!define PUBLISHER "DeclAIre Studios"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZombieCity"
!define WEBSITE "https://declairestudios.wordpress.com"

Name "${APP}"
Caption "${APP} ${VERSION} Setup"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\${APP}"
InstallDirRegKey HKCU "${UNINST_KEY}" "InstallLocation"
BrandingText "${PUBLISHER}"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "CompanyName" "${PUBLISHER}"
VIAddVersionKey "FileDescription" "${APP} Setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "${PUBLISHER}"

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEFINISHPAGE_BITMAP "welcome.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "welcome.bmp"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "header.bmp"
!define MUI_HEADERIMAGE_UNBITMAP "header.bmp"

!define MUI_WELCOMEPAGE_TITLE "Welcome to ${APP}"
!define MUI_WELCOMEPAGE_TEXT "This installs the ${APP} Launcher ${VERSION} on this PC.$\r$\n$\r$\nThe launcher keeps the game up to date by itself, shows the news, and hosts Wi-Fi co-op games.$\r$\n$\r$\nIt installs for your Windows account only, so no administrator password is needed. If ${APP} is open, it will be closed first.$\r$\n$\r$\nClick Next to continue."
!insertmacro MUI_PAGE_WELCOME
; whatever folder is picked, the game goes in a "Zombie City" folder of its own inside it (so uninstalling only ever
; removes that folder)
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE DirLeave
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

; the finish page: start the game now, and a desktop shortcut (both ticked)
!define MUI_FINISHPAGE_TITLE "${APP} is installed"
!define MUI_FINISHPAGE_TEXT "Find it in the Start menu any time.$\r$\n$\r$\nTip: if Windows asks the first time you host a co-op game, allow ${APP} on private networks."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Play ${APP} now"
!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Create a desktop shortcut"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION DesktopShortcut
!define MUI_FINISHPAGE_LINK "Visit the ${APP} website"
!define MUI_FINISHPAGE_LINK_LOCATION "${WEBSITE}"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function DirLeave
  ${GetFileName} "$INSTDIR" $0
  ${If} $0 != "${APP}"
    StrCpy $INSTDIR "$INSTDIR\${APP}"
  ${EndIf}
FunctionEnd

Function DesktopShortcut
  CreateShortCut "$DESKTOP\${APP}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
FunctionEnd

; a running launcher or game would lock its files: close it first (it saves as it goes)
!macro CloseRunning
  nsExec::Exec 'taskkill /IM "${EXE}" /T'
  Sleep 800
  nsExec::Exec 'taskkill /IM "${EXE}" /T /F'
  Sleep 300
!macroend

Section "Install"
  SetShellVarContext current
  !insertmacro CloseRunning
  SetOutPath "$INSTDIR"
  ; an older install may have files the new version no longer has
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  File /r "${SRC}\*.*"
  WriteUninstaller "$INSTDIR\Uninstall ${APP}.exe"
  CreateShortCut "$SMPROGRAMS\${APP}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  ; Windows Settings > Apps
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "${PUBLISHER}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "URLInfoAbout" "${WEBSITE}"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\Uninstall ${APP}.exe"'
  WriteRegStr HKCU "${UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall ${APP}.exe" /S'
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  !insertmacro CloseRunning
  Delete "$SMPROGRAMS\${APP}.lnk"
  Delete "$DESKTOP\${APP}.lnk"
  ; only a folder that really holds the launcher is removed
  ${GetFileName} "$INSTDIR" $0
  ${If} ${FileExists} "$INSTDIR\${EXE}"
  ${AndIf} $0 == "${APP}"
    RMDir /r "$INSTDIR"
  ${Else}
    Delete "$INSTDIR\Uninstall ${APP}.exe"
  ${EndIf}
  DeleteRegKey HKCU "${UNINST_KEY}"
  ; saves, settings and downloaded game updates (in AppData\Roaming\Zombie City) are kept on purpose
SectionEnd
