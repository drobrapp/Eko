# Eko TV · compila el APK sin Gradle (aapt2 + javac + d8 + apksigner del SDK de Android).
# El arte y el motor de Eko se copian de src/ (PC) y android/ (móvil) al compilar, sin duplicarlos en el repo.
#   .\tv\tools\build.ps1                      -> tv\build\eko-tv.apk
#   .\tv\tools\build.ps1 -AssetsOnly          -> solo prepara tv\build\assets (para probar tv.html en el navegador)
param(
    [string]$Jdk = "C:\Users\Aitor\Desktop\EkoTV\tools\jdk17",
    [switch]$AssetsOnly
)
$ErrorActionPreference = "Stop"
$tv   = Resolve-Path "$PSScriptRoot\.."
$repo = Resolve-Path "$tv\.."
$src  = "$tv\app\src\main"
$out  = "$tv\build"
$sdk  = "$env:LOCALAPPDATA\Android\Sdk"
$bt   = "$sdk\build-tools\36.0.0"
$jar  = "$sdk\platforms\android-35\android.jar"

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
$assets = "$out\assets"
New-Item -ItemType Directory -Force "$assets\eko\art", "$assets\eko-tv\art\valley", "$out\classes" | Out-Null

function CopyList($from, $to, $names) {
    foreach ($n in $names) { Get-ChildItem -Path $from -Filter $n | Copy-Item -Destination $to }
}

# 1) Eko: el mismo de la app del móvil (overlay.html y su motor)
CopyList "$repo\android\app\src\main\assets\eko" "$assets\eko" @("overlay.html", "anim.js", "talk.js", "look.js", "style.css")
CopyList "$repo\android\app\src\main\assets\eko\art" "$assets\eko\art" @("cookie.webp")
# lo que Android copia del PC al compilar (android/app/build.gradle.kts, tarea pcAssets)
CopyList "$repo\src" "$assets\eko" @("expr.js", "evo-art.js")
CopyList "$repo\src\art" "$assets\eko\art" @("hat-*.webp", "cape-vampire.webp", "scarf.webp", "nose.webp", "sprout*.webp", "wand.webp", "fx-puff.webp",
    "mug.webp", "book.webp", "glasses.webp", "hp-band.webp", "hp-cupL.webp", "hp-cupR.webp", "nightcap.webp", "popcorn.webp",
    "camera.webp", "brush.webp", "bowtie.webp", "umbrella.webp", "box.webp")

# 2) La escena de la tele y el decorado del Valle (solo zona principal y huerto: nada del estanque)
Copy-Item "$src\assets\eko-tv\*" "$assets\eko-tv" -Recurse
CopyList "$repo\src\art\valley" "$assets\eko-tv\art\valley" @("cloud.webp", "sun.webp", "moon.webp", "hills-far.webp", "hills-mid.webp", "ground.webp",
    "house.webp", "tree.webp", "bush.webp", "fence.webp", "lamp.webp", "sign.webp",
    "h-arch.webp", "h-shed.webp", "g-bed.webp", "h-scarecrow.webp", "h-well.webp", "g-can.webp", "g-seeds.webp", "h-barrow.webp", "h-sunflowers.webp", "g-mariposa.webp")
"Assets: $([math]::Round((Get-ChildItem $assets -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 1)) MB"
if ($AssetsOnly) { "OK: $assets"; return }

# 3) APK base con el manifest (los assets se meten después: aapt2 -A en Windows los guarda con «\» y Android no los encuentra)
& "$bt\aapt2.exe" link -o "$out\base.apk" -I $jar --manifest "$src\AndroidManifest.xml" --min-sdk-version 26 --target-sdk-version 34
if ($LASTEXITCODE) { throw "aapt2 falló" }

# 4) Java -> clases -> dex
$java = Get-ChildItem "$src\java" -Recurse -Filter *.java | ForEach-Object { $_.FullName }
& "$Jdk\bin\javac.exe" -source 8 -target 8 -Xlint:-options -bootclasspath $jar -d "$out\classes" @java
if ($LASTEXITCODE) { throw "javac falló" }
$classes = Get-ChildItem "$out\classes" -Recurse -Filter *.class | ForEach-Object { $_.FullName }
$env:JAVA_HOME = $Jdk
& "$bt\d8.bat" --lib $jar --min-api 26 --output $out @classes
if ($LASTEXITCODE) { throw "d8 falló" }

# 5) Meter classes.dex y los assets (con «/»), alinear y firmar (clave propia de la tele, para poder actualizar sin desinstalar)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open("$out\base.apk", "Update")
[void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, "$out\classes.dex", "classes.dex")
foreach ($f in Get-ChildItem $assets -Recurse -File) {
    $rel = "assets/" + $f.FullName.Substring($assets.Length + 1).Replace("\", "/")
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $rel)
}
$zip.Dispose()
& "$bt\zipalign.exe" -f 4 "$out\base.apk" "$out\aligned.apk"
if ($LASTEXITCODE) { throw "zipalign falló" }
$ks = "$tv\eko-tv.keystore"
if (-not (Test-Path $ks)) {
    & "$Jdk\bin\keytool.exe" -genkeypair -keystore $ks -storepass eko-tv -keypass eko-tv -alias eko -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Eko TV"
}
& "$bt\apksigner.bat" sign --ks $ks --ks-pass pass:eko-tv --key-pass pass:eko-tv --out "$out\eko-tv.apk" "$out\aligned.apk"
if ($LASTEXITCODE) { throw "apksigner falló" }
"OK: $out\eko-tv.apk ($([math]::Round((Get-Item "$out\eko-tv.apk").Length / 1MB, 1)) MB)"
