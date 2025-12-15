# Email Templates for Supabase Auth

This folder contains branded email templates for Project Atlas. These templates are designed to be copied into the Supabase Dashboard.

## Features

- **Dark mode support**: Uses `color-scheme` meta tag and `@media (prefers-color-scheme: dark)` for proper dark mode rendering
- **Email client compatible**: Uses tables for layout, inline styles, and MSO conditionals for Outlook
- **Mobile responsive**: Fluid width with max-width constraint
- **Branded**: Uses Project Atlas branding with the gold primary color (#d4a74a)

## Available Templates

| Template | Supabase Setting | Description |
|----------|------------------|-------------|
| [confirm-signup.md](./confirm-signup.md) | Confirm signup | Sent when a new user registers |
| [invite-user.md](./invite-user.md) | Invite user | Sent when inviting a user to join |
| [magic-link.md](./magic-link.md) | Magic link | Sent for passwordless login |
| [change-email.md](./change-email.md) | Change email address | Sent to confirm email change |
| [reset-password.md](./reset-password.md) | Reset password | Sent for password reset requests |
| [reauthentication.md](./reauthentication.md) | Reauthentication | Sent to verify identity for sensitive actions |

## How to Apply Templates

1. Go to **Supabase Dashboard** > **Authentication** > **Email Templates**
2. Select the template type (e.g., "Confirm signup")
3. Copy the **Subject Line** from the markdown file into the "Subject" field
4. Copy the **HTML Body** (everything inside the ```html code block) into the "Body" field
5. Click **Save**

## Template Variables

Supabase provides these variables that are automatically replaced:

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | The action URL (verify email, reset password, etc.) |
| `{{ .Token }}` | OTP token (if using OTP flow) |
| `{{ .TokenHash }}` | Hashed token |
| `{{ .SiteURL }}` | Your site's base URL |
| `{{ .Email }}` | User's email address |

## Dark Mode Compatibility

These templates use several techniques for dark mode:

1. **Meta tags**: `<meta name="color-scheme" content="light dark">` tells email clients the email supports both modes
2. **CSS classes**: Elements have classes like `.email-bg`, `.content-bg`, `.text-primary` for dark mode overrides
3. **Media query**: `@media (prefers-color-scheme: dark)` provides dark mode styles for supporting clients
4. **Explicit colors**: All text has explicit color values to prevent unwanted inversions

### Gmail Dark Mode Notes

Gmail's dark mode can be aggressive with color inversions. These templates:
- Use explicit background colors (not transparent)
- Use explicit text colors on all text elements
- Avoid pure white (#ffffff) backgrounds in favor of slightly off-white (#f4f4f5)
- Use dark text on the gold buttons to ensure readability

## Testing

Before deploying, test your emails:

1. **Litmus** or **Email on Acid** - Professional email testing tools
2. **Mail-tester.com** - Free spam score checking
3. **Manual testing** - Send to Gmail, Outlook, Apple Mail in both light and dark mode

## Customization

To customize the templates:

1. **Primary color**: Change `#d4a74a` (gold) to your brand color
2. **Logo**: Replace the `&#9670; Project Atlas` text with an image if desired
3. **Footer text**: Update the server name and description
4. **Content**: Modify the messaging to match your tone
