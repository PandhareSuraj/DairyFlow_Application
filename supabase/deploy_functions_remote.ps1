[CmdletBinding()]
param(
    [string]$ProjectRef = "tdtyrgjdqoimbvgxewzr",
    [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN,
    [string]$MyOperatorBaseUrl = $(if ($env:MYOPERATOR_BASE_URL) { $env:MYOPERATOR_BASE_URL } else { $env:WHATSAPP_BASE_URL }),
    [string]$MyOperatorCompanyId = $(if ($env:MYOPERATOR_COMPANY_ID) { $env:MYOPERATOR_COMPANY_ID } else { $env:WHATSAPP_COMPANY_ID }),
    [string]$MyOperatorAuthToken = $(if ($env:MYOPERATOR_AUTH_TOKEN) { $env:MYOPERATOR_AUTH_TOKEN } else { $env:WHATSAPP_API_KEY }),
    [string]$MyOperatorAuthMode = "bearer",
    [string]$MyOperatorPhoneNumberId = $(if ($env:MYOPERATOR_PHONE_NUMBER_ID) { $env:MYOPERATOR_PHONE_NUMBER_ID } else { $env:WHATSAPP_PHONE_NUMBER_ID }),
    [string]$MyOperatorTemplateName = "otp_verify",
    [string]$MyOperatorTemplateLanguage = "en",
    [string]$MyOperatorTemplateOtpVariable = "otp",
    [string]$MyOperatorSendTemplatePath = "/chat/messages",
    [string]$MyOperatorTemplateIncludeLanguage = "false"
)

$ErrorActionPreference = "Stop"

function Require-Value([string]$Name, [string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Missing required value: $Name"
    }
}

function Invoke-SupabaseCli([string[]]$Arguments) {
    & npx.cmd --yes supabase@latest @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Supabase CLI failed: npx supabase $($Arguments -join ' ')"
    }
}

Require-Value "SUPABASE_ACCESS_TOKEN" $AccessToken
Require-Value "MYOPERATOR_BASE_URL" $MyOperatorBaseUrl
Require-Value "MYOPERATOR_COMPANY_ID" $MyOperatorCompanyId
Require-Value "MYOPERATOR_AUTH_TOKEN" $MyOperatorAuthToken
Require-Value "MYOPERATOR_PHONE_NUMBER_ID" $MyOperatorPhoneNumberId
Require-Value "MYOPERATOR_SEND_TEMPLATE_PATH" $MyOperatorSendTemplatePath

$env:SUPABASE_ACCESS_TOKEN = $AccessToken
$projectUrl = "https://$ProjectRef.supabase.co"
$secrets = @{
    MYOPERATOR_BASE_URL               = $MyOperatorBaseUrl
    MYOPERATOR_COMPANY_ID              = $MyOperatorCompanyId
    MYOPERATOR_AUTH_TOKEN              = $MyOperatorAuthToken
    MYOPERATOR_AUTH_MODE               = $MyOperatorAuthMode
    MYOPERATOR_PHONE_NUMBER_ID         = $MyOperatorPhoneNumberId
    MYOPERATOR_TEMPLATE_NAME           = $MyOperatorTemplateName
    MYOPERATOR_TEMPLATE_LANGUAGE       = $MyOperatorTemplateLanguage
    MYOPERATOR_TEMPLATE_OTP_VARIABLE   = $MyOperatorTemplateOtpVariable
    MYOPERATOR_SEND_TEMPLATE_PATH      = $MyOperatorSendTemplatePath
    MYOPERATOR_TEMPLATE_INCLUDE_LANGUAGE = $MyOperatorTemplateIncludeLanguage
}
$secretArguments = @("secrets", "set", "--project-ref", $ProjectRef)
foreach ($entry in $secrets.GetEnumerator()) {
    $secretArguments += "$($entry.Key)=$($entry.Value)"
}

Write-Host "Configuring Edge Function secrets..."
Invoke-SupabaseCli $secretArguments

foreach ($functionName in @(
    "send-whatsapp-otp",
    "verify-admin-whatsapp-login",
    "verify-delivery-qr-login"
)) {
    Write-Host "Deploying $functionName..."
    Invoke-SupabaseCli @("functions", "deploy", $functionName, "--project-ref", $ProjectRef, "--no-verify-jwt")
}

Write-Host "Checking deployed endpoints..."
foreach ($functionName in @(
    "send-whatsapp-otp",
    "verify-admin-whatsapp-login",
    "verify-delivery-qr-login"
)) {
    try {
        $response = Invoke-WebRequest -Method Post `
            -Uri "$projectUrl/functions/v1/$functionName" `
            -ContentType "application/json" `
            -Body "{}"
        Write-Host "$functionName -> HTTP $($response.StatusCode)"
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq 404) {
            throw "$functionName was not deployed."
        }
        Write-Host "$functionName -> HTTP $status (deployed; request validation expected)"
    }
}

Write-Host "DairyFlow Edge Functions are installed."
