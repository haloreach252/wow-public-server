# Admin Panel: Email Notifications for Tester Requests

This document provides instructions for implementing email notifications when tester requests are approved or denied. Emails will be sent via Resend API.

## Overview

When an admin approves or denies a tester access request, an email should be sent to the user notifying them of the decision. This improves UX by keeping users informed without them needing to check the website.

## Prerequisites

1. **Resend API Key**: You'll need a Resend API key. Sign up at https://resend.com
2. **Verified Domain**: Configure your sending domain in Resend (e.g., `noreply@atlas.miniversestudios.com`)

## Implementation

### Step 1: Add Environment Variable

Add to your `.env.local` or environment configuration:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@atlas.miniversestudios.com
```

### Step 2: Install Resend SDK (if not already installed)

```bash
npm install resend
# or
pnpm add resend
```

### Step 3: Create Email Service

**New File:** `src/server/services/email.ts`

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@atlas.miniversestudios.com'
const SITE_NAME = 'Project Atlas'
const SITE_URL = process.env.VITE_SITE_URL || 'https://atlas.miniversestudios.com'

export interface SendEmailResult {
  success: boolean
  error?: string
}

/**
 * Send an email notification for tester request approval
 */
export async function sendTesterApprovalEmail(
  email: string,
  allowedEnvs: string[]
): Promise<SendEmailResult> {
  try {
    const envList = allowedEnvs.length > 0
      ? allowedEnvs.join(', ')
      : 'development'

    const { error } = await resend.emails.send({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `Your Tester Access Request Has Been Approved - ${SITE_NAME}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tester Access Approved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #10b981; margin: 0;">Access Approved!</h1>
  </div>

  <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <p style="margin: 0 0 16px 0;">Great news! Your request for tester access has been approved.</p>

    <p style="margin: 0 0 16px 0;"><strong>Environments you can access:</strong> ${envList}</p>

    <p style="margin: 0;">You can now use the patcher to connect to the assigned test environments. Log in with your existing account credentials.</p>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${SITE_URL}/download" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Download Patcher</a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
    <p style="margin: 0 0 8px 0;">Thank you for helping test ${SITE_NAME}!</p>
    <p style="margin: 0;">Questions? Reply to this email or visit our Discord.</p>
  </div>
</body>
</html>
      `,
      text: `
Great news! Your tester access request for ${SITE_NAME} has been approved.

Environments you can access: ${envList}

You can now use the patcher to connect to the assigned test environments. Log in with your existing account credentials.

Download the patcher: ${SITE_URL}/download

Thank you for helping test ${SITE_NAME}!
      `.trim(),
    })

    if (error) {
      console.error('Failed to send approval email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

/**
 * Send an email notification for tester request denial
 */
export async function sendTesterDenialEmail(email: string): Promise<SendEmailResult> {
  try {
    const { error } = await resend.emails.send({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `Tester Access Request Update - ${SITE_NAME}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tester Access Request Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #6b7280; margin: 0;">Request Update</h1>
  </div>

  <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <p style="margin: 0 0 16px 0;">Thank you for your interest in becoming a tester for ${SITE_NAME}.</p>

    <p style="margin: 0 0 16px 0;">After review, we're unable to approve your tester access request at this time. This could be due to limited testing slots or other factors.</p>

    <p style="margin: 0;">You're welcome to submit a new request in the future, and you can still enjoy the live server with your existing account.</p>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${SITE_URL}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Visit ${SITE_NAME}</a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
    <p style="margin: 0;">Questions? Reply to this email or visit our Discord.</p>
  </div>
</body>
</html>
      `,
      text: `
Thank you for your interest in becoming a tester for ${SITE_NAME}.

After review, we're unable to approve your tester access request at this time. This could be due to limited testing slots or other factors.

You're welcome to submit a new request in the future, and you can still enjoy the live server with your existing account.

Visit ${SITE_NAME}: ${SITE_URL}
      `.trim(),
    })

    if (error) {
      console.error('Failed to send denial email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}
```

### Step 4: Update Tester Request Review Handler

Find where tester requests are reviewed (likely in a server function or API route) and add email sending after the review.

**Example location:** `src/server/services/tester-request.ts` or similar

**Before:**
```typescript
export async function reviewRequest(
  requestId: string,
  adminId: string,
  approved: boolean,
  allowedEnvs?: string[]
) {
  const request = await prisma.testerRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    return { success: false, error: 'Request not found' }
  }

  // Update request status
  await prisma.testerRequest.update({
    where: { id: requestId },
    data: {
      status: approved ? 'approved' : 'denied',
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  })

  // If approved, update user role
  if (approved) {
    await updateUserRoleData(
      request.supabaseUserId,
      'tester',
      allowedEnvs ?? ['dev']
    )
  }

  return { success: true }
}
```

**After:**
```typescript
import { sendTesterApprovalEmail, sendTesterDenialEmail } from './email'

export async function reviewRequest(
  requestId: string,
  adminId: string,
  approved: boolean,
  allowedEnvs?: string[]
) {
  const request = await prisma.testerRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    return { success: false, error: 'Request not found' }
  }

  // Update request status
  await prisma.testerRequest.update({
    where: { id: requestId },
    data: {
      status: approved ? 'approved' : 'denied',
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  })

  // If approved, update user role
  const envs = allowedEnvs ?? ['dev']
  if (approved) {
    await updateUserRoleData(
      request.supabaseUserId,
      'tester',
      envs
    )
  }

  // Send email notification (don't fail the request if email fails)
  try {
    if (approved) {
      await sendTesterApprovalEmail(request.email, envs)
    } else {
      await sendTesterDenialEmail(request.email)
    }
  } catch (error) {
    // Log but don't fail - email is best-effort
    console.error('Failed to send tester request notification email:', error)
  }

  return { success: true }
}
```

### Step 5: Add Audit Logging for Emails (Optional)

If you want to track email sends in the audit log:

```typescript
import { createAuditLogEntry } from './audit'

// After sending email:
try {
  await createAuditLogEntry(
    adminId,
    'admin@email', // or fetch actual admin email
    approved ? 'tester.request.approve.email' : 'tester.request.deny.email',
    request.email,
    { requestId, approved, allowedEnvs: envs }
  )
} catch {
  // Audit log failure shouldn't break the flow
}
```

## Email Templates

### Approval Email Preview

**Subject:** Your Tester Access Request Has Been Approved - Project Atlas

**Content:**
- Green header indicating success
- Lists the environments they can access
- CTA button to download the patcher
- Friendly thank you message

### Denial Email Preview

**Subject:** Tester Access Request Update - Project Atlas

**Content:**
- Neutral header
- Polite message explaining the denial
- Encourages them to try again or use live server
- CTA button to visit the site

## Testing

### Development Testing

Use Resend's test mode or a personal email:

```typescript
// In development, you can override the recipient
const testEmail = process.env.NODE_ENV === 'development'
  ? 'your-email@example.com'
  : email

await resend.emails.send({
  // ...
  to: testEmail,
})
```

### Manual Testing Checklist

- [ ] Set `RESEND_API_KEY` in environment
- [ ] Set `RESEND_FROM_EMAIL` to a verified sender
- [ ] Approve a tester request → check for approval email
- [ ] Deny a tester request → check for denial email
- [ ] Verify emails render correctly on desktop and mobile
- [ ] Verify links in emails work correctly
- [ ] Check that email failures don't break the approval/denial flow

## Error Handling

The email sending is wrapped in try-catch to ensure:
1. Email failures don't prevent the request from being processed
2. Errors are logged for debugging
3. The admin still sees success (since the actual approval happened)

If you want to notify admins when email fails:

```typescript
try {
  if (approved) {
    const emailResult = await sendTesterApprovalEmail(request.email, envs)
    if (!emailResult.success) {
      console.warn('Approval email failed:', emailResult.error)
      // Optionally: Return a warning in the response
      return { success: true, warning: 'Request approved but email notification failed' }
    }
  }
  // ...
} catch (error) {
  console.error('Email error:', error)
  return { success: true, warning: 'Request processed but email notification failed' }
}
```

## Deployment Checklist

- [ ] Add `RESEND_API_KEY` to production environment
- [ ] Add `RESEND_FROM_EMAIL` to production environment
- [ ] Verify sending domain in Resend dashboard
- [ ] Create `src/server/services/email.ts`
- [ ] Update tester request review function to send emails
- [ ] Test approval email
- [ ] Test denial email
- [ ] Deploy and verify in production

## Security Notes

1. **API Key Security**: Never commit the Resend API key. Use environment variables.
2. **Email Validation**: The email comes from the tester request record which was validated during submission.
3. **Rate Limiting**: Resend has built-in rate limits, but be mindful if processing many requests at once.
4. **Content Injection**: The email templates use hardcoded content - no user input is directly inserted into HTML.
