# Script to setup a scheduled task for updating invoices

$taskName = "UpdateWoltInvoices"
$scriptPath = "C:\Users\hothifa h\Desktop\hudhaifa-invoices\backend\production-test.js"
$triggerTime = "PT1H" # كل ساعة

$action = New-ScheduledTaskAction -Execute "node" -Argument $scriptPath
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval $triggerTime -RepetitionDuration ([TimeSpan]::MaxValue)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description "Automatically update Wolt invoices every hour"

Write-Host "Scheduled task '$taskName' created to run every hour."