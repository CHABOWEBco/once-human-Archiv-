param(
    [int]$WebPort = 5500,
    [int]$BridgePort = 8787,
    [int]$OverlayWidthPercent = 96,
    [int]$OverlayHeightPercent = 94
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Info([string]$Text) { Write-Host "[Once Human Archiv Overlay] $Text" -ForegroundColor Cyan }
function Write-Warn([string]$Text) { Write-Host "[Once Human Archiv Overlay] $Text" -ForegroundColor Yellow }
function Test-Port([int]$Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $result = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $result.AsyncWaitHandle.WaitOne(200)) { $client.Close(); return $false }
        $client.EndConnect($result); $client.Close(); return $true
    } catch { return $false }
}
function Test-ArchivServer([int]$Port) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/index.html" -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>Once Human Archiv</title>'
    } catch { return $false }
}
function Find-Edge {
    $candidates = @(
        "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
    ) | Where-Object { $_ -and (Test-Path $_) }
    if ($candidates.Count -eq 0) { throw 'Microsoft Edge wurde nicht gefunden.' }
    return $candidates[0]
}
function Wait-ArchivServer([int]$Port) {
    for ($i = 0; $i -lt 40; $i++) {
        if (Test-ArchivServer $Port) { return }
        Start-Sleep -Milliseconds 150
    }
    throw "Lokaler Website-Server auf Port $Port ist nicht bereit."
}
function Wait-OverlayWindow([int]$PreferredProcessId) {
    for ($i = 0; $i -lt 120; $i++) {
        $h = [JmaOverlayNative]::FindEdgeOverlayWindow($PreferredProcessId)
        if ($h -ne [IntPtr]::Zero) { return $h }
        Start-Sleep -Milliseconds 100
    }
    throw 'Das Edge-App-Fenster der Archivkarte wurde nicht gefunden.'
}
function Post-WindowProvider([int]$Port, [string]$Token, [bool]$Running) {
    try {
        $body = @{ provider='windows-window'; gameRunning=$Running; scene='unknown' } | ConvertTo-Json -Compress
        Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$Port/provider" -Headers @{ Authorization = "Bearer $Token" } -ContentType 'application/json' -Body $body -TimeoutSec 1 | Out-Null
        return $true
    } catch { return $false }
}

if ($WebPort -lt 1024 -or $WebPort -gt 65535) { throw 'WebPort muss 1024-65535 sein.' }
if ($BridgePort -lt 1024 -or $BridgePort -gt 65535) { throw 'BridgePort muss 1024-65535 sein.' }
$OverlayWidthPercent = [Math]::Max(60, [Math]::Min(100, $OverlayWidthPercent))
$OverlayHeightPercent = [Math]::Max(60, [Math]::Min(100, $OverlayHeightPercent))

$RepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$NativeSource = Join-Path $PSScriptRoot 'OverlayNative.cs'
$BridgeScript = Join-Path $RepoRoot 'companion\bridge\server.js'
if (-not (Test-Path (Join-Path $RepoRoot 'index.html'))) { throw "Repository-Root nicht gefunden: $RepoRoot" }
if (-not (Test-Path $NativeSource)) { throw "OverlayNative.cs fehlt: $NativeSource" }

Add-Type -Path $NativeSource
[JmaOverlayNative]::EnablePerMonitorDpi()

$webProcess = $null
$bridgeProcess = $null
$edgeProcess = $null
$overlayHwnd = [IntPtr]::Zero
$gameHwnd = [IntPtr]::Zero
$overlayVisible = $false
$ownsWebServer = $false
$ownsBridge = $false
$bridgeReady = $false
$providerToken = $null
$oldBridgePort = $env:JMA_BRIDGE_PORT
$oldBridgeToken = $env:JMA_BRIDGE_TOKEN
$oldBrowserOrigins = $env:JMA_BROWSER_ORIGINS

try {
    if (Test-Port $WebPort) {
        if (-not (Test-ArchivServer $WebPort)) { throw "Port $WebPort ist bereits durch einen anderen Dienst belegt." }
        Write-Info "Vorhandener Archiv-Webserver auf 127.0.0.1:$WebPort wird verwendet."
    } else {
        $python = Get-Command py -ErrorAction SilentlyContinue
        $pythonArgs = @('-m','http.server',"$WebPort",'--bind','127.0.0.1')
        if (-not $python) { $python = Get-Command python -ErrorAction SilentlyContinue }
        if (-not $python) { throw 'Python wurde nicht gefunden. Benötigt: py oder python im PATH.' }
        $webProcess = Start-Process -FilePath $python.Source -ArgumentList $pythonArgs -WorkingDirectory $RepoRoot -WindowStyle Hidden -PassThru
        $ownsWebServer = $true
        Wait-ArchivServer $WebPort
        Write-Info "Lokaler Archiv-Webserver: http://127.0.0.1:$WebPort"
    }

    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node -and -not (Test-Port $BridgePort)) {
        $bytes = New-Object byte[] 32
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $providerToken = [Convert]::ToBase64String($bytes)
        $env:JMA_BRIDGE_PORT = "$BridgePort"
        $env:JMA_BRIDGE_TOKEN = $providerToken
        $env:JMA_BROWSER_ORIGINS = "http://127.0.0.1:$WebPort,http://localhost:$WebPort"
        $bridgeProcess = Start-Process -FilePath $node.Source -ArgumentList "`"$BridgeScript`"" -WorkingDirectory $RepoRoot -WindowStyle Hidden -PassThru
        $ownsBridge = $true
        for ($i = 0; $i -lt 40; $i++) { if (Test-Port $BridgePort) { $bridgeReady = $true; break }; Start-Sleep -Milliseconds 150 }
        if (-not $bridgeReady) { throw "Bridge auf Port $BridgePort konnte nicht gestartet werden." }
        Write-Info "Lokale Companion-Bridge: ws://127.0.0.1:$BridgePort"
    } elseif ($node -and (Test-Port $BridgePort)) {
        $bridgeReady = $true
        Write-Warn "Port $BridgePort ist bereits belegt. Vorhandene Bridge wird nicht überschrieben; Fensterstatus-Provider bleibt für diesen Start aus."
    } else {
        Write-Warn 'Node.js nicht gefunden. Overlay funktioniert, Companion-Bridge/Spiel-erkannt-Status wird nicht automatisch gestartet.'
    }

    $companionQuery = if ($bridgeReady) { "?companion=windows-overlay&port=$BridgePort" } else { '' }
    $mapUrl = "http://127.0.0.1:$WebPort/index.html$companionQuery#/map"
    $edge = Find-Edge
    $profile = Join-Path $env:LOCALAPPDATA 'OnceHumanArchiv\OverlayEdgeProfile'
    New-Item -ItemType Directory -Force -Path $profile | Out-Null
    $edgeArgs = @(
        "--app=$mapUrl",
        "--user-data-dir=`"$profile`"",
        '--no-first-run',
        '--disable-session-crashed-bubble'
    )
    $edgeProcess = Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru
    $overlayHwnd = Wait-OverlayWindow $edgeProcess.Id
    [JmaOverlayNative]::PrepareOverlay($overlayHwnd)
    [JmaOverlayNative]::HideOverlay($overlayHwnd)

    Write-Info 'Private Windows-Overlay ist bereit.'
    Write-Host ''
    Write-Host '  Shift + F9  = Karte im Spiel ein-/ausblenden' -ForegroundColor Green
    Write-Host '  Karte ist beim Start absichtlich versteckt.' -ForegroundColor Gray
    Write-Host '  Beim Ausblenden bekommt Once Human den Fokus zurück.' -ForegroundColor Gray
    Write-Host '  Für zuverlässiges Overlay: Once Human im Fenster- oder randlosen Vollbildmodus verwenden.' -ForegroundColor Gray
    Write-Host '  Beenden: dieses Fenster mit Ctrl+C schließen.' -ForegroundColor Gray
    Write-Host ''

    $lastHotkey = $false
    $lastPost = [DateTime]::MinValue
    $lastRunning = $null

    while ($true) {
        if (-not [JmaOverlayNative]::IsAlive($overlayHwnd)) { throw 'Overlay-Fenster wurde geschlossen.' }
        $gameHwnd = [JmaOverlayNative]::FindOnceHumanWindow()
        $gameRunning = $gameHwnd -ne [IntPtr]::Zero

        if ($ownsBridge -and ((Get-Date) - $lastPost).TotalMilliseconds -ge 1000) {
            [void](Post-WindowProvider $BridgePort $providerToken $gameRunning)
            $lastPost = Get-Date
        }
        if ($lastRunning -ne $gameRunning) {
            if ($gameRunning) { Write-Info 'Once Human Fenster erkannt.' } else { Write-Warn 'Once Human Fenster nicht erkannt.' }
            $lastRunning = $gameRunning
        }

        if (-not $gameRunning -and $overlayVisible) {
            [JmaOverlayNative]::HideOverlay($overlayHwnd)
            $overlayVisible = $false
        }

        if ($gameRunning -and $overlayVisible) {
            $bounds = New-Object 'JmaOverlayNative+RECT'
            if ([JmaOverlayNative]::TryGetClientBounds($gameHwnd, [ref]$bounds)) {
                $gameWidth = [Math]::Max(1, $bounds.Right - $bounds.Left)
                $gameHeight = [Math]::Max(1, $bounds.Bottom - $bounds.Top)
                $width = [int][Math]::Round($gameWidth * ($OverlayWidthPercent / 100.0))
                $height = [int][Math]::Round($gameHeight * ($OverlayHeightPercent / 100.0))
                $x = $bounds.Left + [int][Math]::Round(($gameWidth - $width) / 2.0)
                $y = $bounds.Top + [int][Math]::Round(($gameHeight - $height) / 2.0)
                [JmaOverlayNative]::PlaceOverlay($overlayHwnd, $x, $y, $width, $height, $false)
            }
        }

        $hotkey = [JmaOverlayNative]::KeyDown(0x10) -and [JmaOverlayNative]::KeyDown(0x78)
        if ($hotkey -and -not $lastHotkey) {
            if (-not $gameRunning) {
                Write-Warn 'Shift+F9: Once Human ist noch nicht als Hauptfenster erkannt.'
            } elseif ($overlayVisible) {
                [JmaOverlayNative]::HideOverlay($overlayHwnd)
                [JmaOverlayNative]::FocusWindow($gameHwnd)
                $overlayVisible = $false
                Write-Info 'Karte ausgeblendet.'
            } else {
                $bounds = New-Object 'JmaOverlayNative+RECT'
                if ([JmaOverlayNative]::TryGetClientBounds($gameHwnd, [ref]$bounds)) {
                    $gameWidth = [Math]::Max(1, $bounds.Right - $bounds.Left)
                    $gameHeight = [Math]::Max(1, $bounds.Bottom - $bounds.Top)
                    $width = [int][Math]::Round($gameWidth * ($OverlayWidthPercent / 100.0))
                    $height = [int][Math]::Round($gameHeight * ($OverlayHeightPercent / 100.0))
                    $x = $bounds.Left + [int][Math]::Round(($gameWidth - $width) / 2.0)
                    $y = $bounds.Top + [int][Math]::Round(($gameHeight - $height) / 2.0)
                    [JmaOverlayNative]::PlaceOverlay($overlayHwnd, $x, $y, $width, $height, $true)
                    $overlayVisible = $true
                    Write-Info 'Karte eingeblendet und interaktiv.'
                }
            }
        }
        $lastHotkey = $hotkey
        Start-Sleep -Milliseconds 50
    }
}
finally {
    try { if ($overlayHwnd -ne [IntPtr]::Zero) { [JmaOverlayNative]::HideOverlay($overlayHwnd) } } catch { }
    try { if ($edgeProcess -and -not $edgeProcess.HasExited) { Stop-Process -Id $edgeProcess.Id -Force -ErrorAction SilentlyContinue } } catch { }
    try { if ($ownsBridge -and $bridgeProcess -and -not $bridgeProcess.HasExited) { Stop-Process -Id $bridgeProcess.Id -Force -ErrorAction SilentlyContinue } } catch { }
    try { if ($ownsWebServer -and $webProcess -and -not $webProcess.HasExited) { Stop-Process -Id $webProcess.Id -Force -ErrorAction SilentlyContinue } } catch { }
    $env:JMA_BRIDGE_PORT = $oldBridgePort
    $env:JMA_BRIDGE_TOKEN = $oldBridgeToken
    $env:JMA_BROWSER_ORIGINS = $oldBrowserOrigins
    Write-Info 'Overlay beendet.'
}
