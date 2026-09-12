# 実機で撮ったスクリーンショット(1125x2436など)を、
# App Store Connect が求める6.5インチ表示の実寸(1284x2778)へ高品質にリサイズする。
# アルファチャンネル無し(Format24bppRgb)で保存する。
#
#   powershell -File tools/resize-real-shots.ps1 <入力フォルダ> <出力フォルダ>

param(
  [string]$srcDir,
  [string]$outDir = "C:\Users\bestp\Projects\choritsu-note\store\screenshots-ios-real"
)

Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$targetW = 1284
$targetH = 2778

$order = @("IMG_0644.png", "IMG_0645.png", "IMG_0646.png", "IMG_0647.png", "IMG_0648.png")
$names = @("1-home.png", "2-customers-a.png", "3-customers-b.png", "4-revenue.png", "5-record.png")

for ($i = 0; $i -lt $order.Length; $i++) {
  $fpath = Join-Path $srcDir $order[$i]
  $outPath = Join-Path $outDir $names[$i]
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
  $flat.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $flat.Dispose()
  Write-Output ("  " + $order[$i] + " -> " + $names[$i] + " (" + $ow + "x" + $oh + ")")
}
Write-Output "done"
