param(
    [string]$DbHost = "",
    [int]$DbPort = 0,
    [string]$DbName = "",
    [string]$DbUser = "",
    [string]$DbPassword = "",
    [string]$MySqlDumpPath = "C:\xampp\mysql\bin\mysqldump.exe",
    [string]$OutputDir = "",
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

function Load-EnvFile([string]$Path) {
    $map = @{}
    if (-not (Test-Path $Path)) { return $map }
    Get-Content -Path $Path | ForEach-Object {
        $line = [string]$_
        if ([string]::IsNullOrWhiteSpace($line)) { return }
        $trimmed = $line.Trim()
        if ($trimmed.StartsWith("#")) { return }
        $eq = $trimmed.IndexOf("=")
        if ($eq -lt 1) { return }
        $key = $trimmed.Substring(0, $eq).Trim()
        $value = $trimmed.Substring($eq + 1).Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        } elseif ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $map[$key] = $value
    }
    return $map
}

$envPath = Join-Path $PSScriptRoot "..\.env"
$envVars = Load-EnvFile ([System.IO.Path]::GetFullPath($envPath))

if ([string]::IsNullOrWhiteSpace($DbHost)) { $DbHost = [string]($envVars["DB_HOST"]) }
if ($DbPort -le 0) { $DbPort = [int]([string]($envVars["DB_PORT"])) }
if ([string]::IsNullOrWhiteSpace($DbName)) { $DbName = [string]($envVars["DB_NAME"]) }
if ([string]::IsNullOrWhiteSpace($DbUser)) { $DbUser = [string]($envVars["DB_USER"]) }
if ([string]::IsNullOrWhiteSpace($DbPassword)) { $DbPassword = [string]($envVars["DB_PASS"]) }

if ([string]::IsNullOrWhiteSpace($DbHost)) { $DbHost = "127.0.0.1" }
if ($DbPort -le 0) { $DbPort = 3306 }
if ([string]::IsNullOrWhiteSpace($DbName)) { $DbName = "barangay" }
if ([string]::IsNullOrWhiteSpace($DbUser)) { $DbUser = "root" }

if (-not (Test-Path $MySqlDumpPath)) {
    throw "mysqldump not found at: $MySqlDumpPath"
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $PSScriptRoot "..\backups\db"
}
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$fileName = "{0}_{1}.sql" -f $DbName, $timestamp
$fullPath = Join-Path $OutputDir $fileName

$args = @(
    "--host=$DbHost",
    "--port=$DbPort",
    "--user=$DbUser",
    "--single-transaction",
    "--routines",
    "--triggers",
    "--events",
    "--databases",
    $DbName
)

if ($DbPassword -ne "") {
    $args = @("--password=$DbPassword") + $args
}

$dumpOutput = & $MySqlDumpPath @args 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Backup failed. mysqldump exit code: $LASTEXITCODE`n$dumpOutput"
}

$dumpOutput | Out-File -FilePath $fullPath -Encoding utf8

$cutoff = (Get-Date).AddDays(-1 * $RetentionDays)
Get-ChildItem -Path $OutputDir -Filter "*.sql" -File |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    Remove-Item -Force

Write-Host "Backup created: $fullPath"
Write-Host "Retention cleanup done (older than $RetentionDays days)."
