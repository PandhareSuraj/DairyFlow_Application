[CmdletBinding()]
param(
    [string]$BaseUrl = $(if ($env:MYOPERATOR_BASE_URL) { $env:MYOPERATOR_BASE_URL } else { $env:WHATSAPP_BASE_URL }),
    [string]$CompanyId = $(if ($env:MYOPERATOR_COMPANY_ID) { $env:MYOPERATOR_COMPANY_ID } else { $env:WHATSAPP_COMPANY_ID }),
    [string]$AuthToken = $(if ($env:MYOPERATOR_AUTH_TOKEN) { $env:MYOPERATOR_AUTH_TOKEN } else { $env:WHATSAPP_API_KEY }),
    [string]$PhoneNumberId = $(if ($env:MYOPERATOR_PHONE_NUMBER_ID) { $env:MYOPERATOR_PHONE_NUMBER_ID } else { $env:WHATSAPP_PHONE_NUMBER_ID }),
    [string]$SendPath = "/chat/messages",
    [string]$TemplateName = "otp_verify",
    [string]$TemplateLanguage = "en",
    [string]$TemplateOtpVariable = "otp",
    [string]$Recipient = "918275838256",
    [string]$Otp = "482731",
    [ValidateSet("all", "bearer", "authorization", "x-api-key", "query")]
    [string]$AuthMode = "all"
)

$ErrorActionPreference = "Stop"

function Require-Value([string]$Name, [string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Missing required value: $Name"
    }
}

Require-Value "MYOPERATOR_BASE_URL" $BaseUrl
Require-Value "MYOPERATOR_COMPANY_ID" $CompanyId
Require-Value "MYOPERATOR_AUTH_TOKEN" $AuthToken
Require-Value "MYOPERATOR_PHONE_NUMBER_ID" $PhoneNumberId

$BaseUrl = $BaseUrl.TrimEnd("/")
$SendPath = "/$($SendPath.TrimStart('/'))"
$digits = $Recipient -replace "\D", ""
$countryCode = if ($digits.StartsWith("91") -and $digits.Length -gt 10) { "91" } else { "" }
$nationalNumber = if ($countryCode) { $digits.Substring($countryCode.Length) } else { $digits }
if ($digits.Length -eq 10) {
    $countryCode = "91"
    $nationalNumber = $digits
}
$templateBody = @{}
$templateBody[$TemplateOtpVariable] = $Otp
$payload = @{
    phone_number_id       = $PhoneNumberId
    customer_country_code = $countryCode
    customer_number       = $nationalNumber
    data                  = @{
        type    = "template"
        context = @{
            template_name = $TemplateName
            body          = $templateBody
            buttons       = @(@{
                index = 0
                otp   = $Otp
            })
        }
    }
    reply_to              = $null
    myop_ref_id           = $null
    trail                 = @{ name = $null }
} | ConvertTo-Json -Depth 8 -Compress

$modes = if ($AuthMode -eq "all") {
    @("bearer", "authorization", "x-api-key", "query")
} else {
    @($AuthMode)
}

foreach ($mode in $modes) {
    $uri = "${BaseUrl}${SendPath}"
    $headers = @{ "Accept" = "application/json"; "X-MYOP-COMPANY-ID" = $CompanyId }
    if ($mode -eq "bearer") {
        $headers.Authorization = "Bearer $AuthToken"
    } elseif ($mode -eq "authorization") {
        $headers.Authorization = $AuthToken
    } elseif ($mode -eq "x-api-key") {
        $headers["x-api-key"] = $AuthToken
    } elseif ($mode -eq "query") {
        $separator = if ($uri.Contains("?")) { "&" } else { "?" }
        $uri = "$uri${separator}token=$AuthToken"
    }

    try {
        $response = Invoke-WebRequest -Method Post -Uri $uri -Headers $headers -ContentType "application/json" -Body $payload
        Write-Host "$mode -> HTTP $($response.StatusCode)"
        if ($response.Content) {
            Write-Host $response.Content
        }
        Write-Host "Accepted auth mode: $mode"
        exit 0
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $body = $_.ErrorDetails.Message
        if (-not $body) {
            $body = $_.Exception.Message
        }
        Write-Host "$mode -> HTTP $status"
        Write-Host ($body -replace [regex]::Escape($AuthToken), "[redacted]")
    }
}

throw "MyOperator rejected every tested authentication mode."
