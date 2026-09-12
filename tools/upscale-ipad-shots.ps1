# store/screenshots-ipad/ に1024x1366で撮った画像を、
# App Store Connect が求める13インチiPad表示の実寸(2048x2732)へ高品質に拡大する。
# アルファチャンネル無し(Format24bppRgb)に変換している。App Store Connect は
# RGBA(アルファチャンネルあり)のPNGだと、アップロード枚数はカウントするのに
# サムネイルの生成に失敗し「！」エラーのまま審査に進めなくなる事象を確認したため。
#
#   powershell -File tools/upscale-ipad-shots.ps1

Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot "..\store\screenshots-ipad"
$targetW = 2048
$targetH = 2732

$files = Get-ChildItem -Path $dir -Filter "*.png"
foreach ($file in $files) {
  $fname = $file.Name
  $fpath = $file.FullName
  $src = [System.Drawing.Image]::FromFile($fpath)
  $ow = $targetW
  $oh = $targetH
  $out = New-Object System.Drawing.Bitmap($ow, $oh)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($src, 0, 0, $ow, $oh)
  $src.Dispose()
  $g.Dispose()
  $rect = New-Object System.Drawing.Rectangle(0, 0, $ow, $oh)
  $pf = [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
  $flat = $out.Clone($rect, $pf)
  $out.Dispose()
  $flat.Save($fpath, [System.Drawing.Imaging.ImageFormat]::Png)
  $flat.Dispose()
  Write-Output ("  " + $fname + " -> " + $ow + "x" + $oh)
}
Write-Output "done"
