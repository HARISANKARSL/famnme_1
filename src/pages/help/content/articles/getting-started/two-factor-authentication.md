---
title: Two-factor authentication (2FA)
description: How the email code works and when to use "Remember this device".
updated: 2026-04-20
order: 3
tags: [2fa, security, login]
---

Every sign-in is protected by two-factor authentication. After your password is verified, FamNme emails you a 6-digit code. You enter that code to complete the login.

## Why email codes

Most FamNme users don't run authenticator apps. Email is universal, works on any device, and the codes are short-lived (10 minutes) with a strict attempt limit.

## The flow

1. Enter email + password.
2. We show a code-entry screen with your email partially masked.
3. We email a 6-digit code — it arrives within a few seconds.
4. Enter the code. If correct, you're signed in.

## Remember this device (30 days)

If you tick **Remember for 30 days** on the login screen, we skip 2FA the next time you sign in from the same network. This lasts 30 days or until you clear your browser storage.

- Good for: your personal laptop, your phone, your work computer.
- Not good for: shared or public devices — anyone using that browser could sign in without the code.

The trusted-device check looks at your IP address. If your IP changes (for example, travelling on a different network), you'll be asked for a fresh 2FA code — that's expected.

## If codes don't arrive

- Check your spam folder first.
- Use the **Resend code** button on the 2FA screen. You can resend up to 5 times in 10 minutes.
- Verify your email address is typed correctly — typos here are common.

## Account lockout

After 5 failed 2FA entries in a single session, the code is invalidated and you'll need to sign in again to get a fresh one. After 5 failed **password** attempts on a real account, the account is locked for 30 minutes to stop automated guessing.
