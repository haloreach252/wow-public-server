# Change Email Address Template

Copy the HTML below into Supabase Dashboard > Authentication > Email Templates > Change email address

## Subject Line

```
Confirm your new email address - Project Atlas
```

## HTML Body

```html
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Confirm email change</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #0a0a0a !important; }
      .content-bg { background-color: #171717 !important; }
      .text-primary { color: #fafafa !important; }
      .text-muted { color: #a1a1aa !important; }
      .alert-bg { background-color: #422006 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 28px; font-weight: bold; color: #d4a74a;">
                    &#9670; Project Atlas
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="content-bg" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 32px;">
                    <!-- Heading -->
                    <h1 class="text-primary" style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b; text-align: center;">
                      Confirm your new email
                    </h1>
                    <!-- Subtext -->
                    <p class="text-muted" style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #71717a; text-align: center;">
                      You requested to change your email address for your Project Atlas account. Click the button below to confirm this change.
                    </p>
                    <!-- Alert Box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="alert-bg" style="padding: 16px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
                          <p style="margin: 0; font-size: 14px; line-height: 20px; color: #92400e;">
                            <strong>Important:</strong> After confirming, you'll need to use this new email address to sign in to your account.
                          </p>
                        </td>
                      </tr>
                    </table>
                    <!-- Spacer -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="height: 24px;"></td>
                      </tr>
                    </table>
                    <!-- Button -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom: 32px;">
                          <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #d4a74a; color: #0a0a0a; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                            Confirm Email Change
                          </a>
                        </td>
                      </tr>
                    </table>
                    <!-- Divider -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-bottom: 24px; border-bottom: 1px solid #e4e4e7;"></td>
                      </tr>
                    </table>
                    <!-- Security Note -->
                    <p class="text-muted" style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #71717a;">
                      If you didn't request this email change, please secure your account immediately by changing your password.
                    </p>
                    <p class="text-muted" style="margin: 16px 0 0 0; font-size: 14px; line-height: 20px; color: #71717a;">
                      This link will expire in 24 hours.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p class="text-muted" style="margin: 0 0 8px 0; font-size: 12px; color: #a1a1aa;">
                Project Atlas - WotLK 3.3.5a Classic+ Server
              </p>
              <p class="text-muted" style="margin: 0; font-size: 12px; color: #a1a1aa;">
                Not affiliated with Blizzard Entertainment.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
