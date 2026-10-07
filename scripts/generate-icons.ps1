# Genere les icones PNG de l'extension (marque-page blanc sur fond violet).
# Usage : powershell -ExecutionPolicy Bypass -File scripts\generate-icons.ps1

Add-Type -AssemblyName System.Drawing
$iconsDir = Join-Path (Split-Path -Parent $PSScriptRoot) "icons"
New-Item -ItemType Directory -Force $iconsDir | Out-Null

foreach ($size in 16, 32, 48, 128) {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Fond : carre arrondi violet
    $radius = [Math]::Max(3, $size * 0.22)
    $d = $radius * 2
    $max = $size - 1
    $bg = New-Object System.Drawing.Drawing2D.GraphicsPath
    $bg.AddArc(0, 0, $d, $d, 180, 90)
    $bg.AddArc($max - $d, 0, $d, $d, 270, 90)
    $bg.AddArc($max - $d, $max - $d, $d, $d, 0, 90)
    $bg.AddArc(0, $max - $d, $d, $d, 90, 90)
    $bg.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(124, 77, 189))), $bg)

    # Marque-page blanc
    $left = $size * 0.30; $right = $size * 0.70
    $top = $size * 0.20; $bottom = $size * 0.82; $notch = $size * 0.62
    $points = [System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF $left, $top),
        (New-Object System.Drawing.PointF $right, $top),
        (New-Object System.Drawing.PointF $right, $bottom),
        (New-Object System.Drawing.PointF ($size * 0.5), $notch),
        (New-Object System.Drawing.PointF $left, $bottom)
    )
    $g.FillPolygon([System.Drawing.Brushes]::White, $points)

    $path = Join-Path $iconsDir "icon-$size.png"
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bitmap.Dispose()
    Write-Host "OK $path"
}
