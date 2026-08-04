$w = "C:\Users\Abdulrahman\Documents\مقاولات إلكترونية 2\ACEP"

$p1 = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $w -WindowStyle Hidden -PassThru
Write-Output "Main server PID: $($p1.Id)"

$p2 = Start-Process -FilePath "node" -ArgumentList "packages/services/api-gateway/dist/index.js" -WorkingDirectory $w -WindowStyle Hidden -PassThru
Write-Output "API Gateway PID: $($p2.Id)"

$p3 = Start-Process -FilePath "node" -ArgumentList "packages/ui/web/serve.js" -WorkingDirectory $w -WindowStyle Hidden -PassThru
Write-Output "UI Web Server PID: $($p3.Id)"