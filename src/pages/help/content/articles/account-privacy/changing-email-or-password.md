---
title: Changing email or password
description: Keep your account secure with updated credentials.
updated: 2026-04-20
order: 2
tags: [email, password, change, security]
---

Both email and password changes happen under **Settings → Account**. Both require verifying your current password before any change takes effect.

## Changing your password

1. Enter current password.
2. Enter new password. The strength meter shows live feedback; you need the same rules as signup (12+ chars, upper/lower/digit/special).
3. Re-enter new password to confirm.
4. Save.

After a successful password change:

- **Every other session is signed out immediately.** The JWT token-version counter is bumped, so existing tokens are rejected. You stay signed in on the current tab only.
- You'll receive a confirmation email.

## Changing your email

1. Enter current password.
2. Enter the new email address.
3. We send a verification link to the new address; click it to finalize the change.
4. Until you verify, the old address remains on the account.

The old email is notified of the change request for safety. If someone changes your email without your consent, the old email is how you recover.

## Forgot your password?

From the login page, click **Forgot password**. Enter your email; you'll get a reset link (valid for 1 hour). Clicking it lets you set a new password without knowing the old one.

Password reset triggers the same session-invalidation behavior — every session is signed out.

## Password expiry

FamNme encourages a password refresh every 90 days but doesn't force it. Users who set their password over 90 days ago see a gentle nudge on sign-in with a *Change now* button and a *Later* button.
