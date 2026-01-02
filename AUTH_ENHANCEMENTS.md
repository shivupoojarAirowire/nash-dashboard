# Authentication Enhancements

## Overview
The authentication system has been enhanced with three new features:
1. **Forgot Password** - Email-based password recovery
2. **OTP Authentication** - One-time password sign-in
3. **Password Reset** - Secure password update with confirmation

## Features

### 1. Forgot Password Flow

Users can reset their password by clicking "Forgot password?" on the login form.

**Flow:**
1. Click "Forgot password?" link on login page
2. Enter email address
3. Receive password reset link via email
4. Click link in email to open recovery page
5. Enter new password and confirm
6. Password is updated and user can log in with new password

**Implementation:**
- Uses `supabase.auth.resetPasswordForEmail()` to send reset email
- Reset link redirects to `/auth?mode=recovery`
- Password update is handled by `handleResetPassword()` function
- Requires at least 8 characters for new password

**State Variables:**
- `showForgotPassword` - toggles forgot password form
- `newPassword` - stores new password input
- `confirmPassword` - stores password confirmation input
- `resetLoading` - shows loading state during reset

### 2. OTP (One-Time Password) Authentication

Users can sign in using a one-time password sent to their email instead of their password.

**Flow:**
1. Click "Sign in with OTP instead" on login page
2. Enter email address
3. Click "Send OTP"
4. Receive 6-digit code via email
5. Enter the code
6. Click "Verify OTP"
7. User is logged in

**Implementation:**
- Uses `supabase.auth.signInWithOtp()` to send OTP
- OTP input is restricted to 6 digits
- Uses `supabase.auth.verifyOtp()` to verify and authenticate
- OTP emails are sent by Supabase Auth service
- Supports automatic session creation after OTP verification

**State Variables:**
- `showOtpAuth` - toggles OTP authentication form
- `otpEmail` - stores email for OTP
- `otp` - stores the 6-digit OTP
- `otpSent` - tracks if OTP was sent
- `otpLoading` - shows loading state during OTP operations

### 3. Password Reset from Recovery Email

When user clicks the password reset link in their email:

**Flow:**
1. User receives reset email
2. Clicks link which opens auth page with `?mode=recovery` parameter
3. Form automatically appears for setting new password
4. User enters new password and confirmation
5. Clicks "Update Password"
6. Password is updated in Supabase
7. User redirected to login

**Implementation:**
- Recovery form only shows when `mode=recovery` query parameter exists
- Password must be at least 8 characters
- Uses `supabase.auth.updateUser()` with new password
- Redirects to `/auth` after successful update

## Handler Functions

### `handleForgotPassword(e: React.FormEvent)`
Sends a password reset email to the user's registered email address.

```typescript
// Called when user submits forgot password form
// Validates email input
// Calls supabase.auth.resetPasswordForEmail()
// Shows toast notification on success/failure
// Resets form and hides forgot password UI
```

**Error Handling:**
- Empty email validation
- Supabase API errors
- Email delivery failures (handled by Supabase)

### `handleSendOtp(e: React.FormEvent)`
Sends a one-time password to the user's email address.

```typescript
// Called when user clicks "Send OTP"
// Validates email input
// Calls supabase.auth.signInWithOtp()
// Sets otpSent to true to show OTP input field
// Shows toast notification on success/failure
```

**Error Handling:**
- Empty email validation
- Supabase API errors
- OTP delivery failures

### `handleVerifyOtp(e: React.FormEvent)`
Verifies the OTP and creates an authenticated session.

```typescript
// Called when user submits OTP code
// Validates OTP is 6 digits
// Calls supabase.auth.verifyOtp()
// Creates user session on success
// Clears form and returns to main UI
```

**Error Handling:**
- OTP length validation
- Invalid/expired OTP
- Supabase API errors

### `handleResetPassword(e: React.FormEvent)`
Updates the user's password after email verification.

```typescript
// Called when user submits password reset form (mode=recovery)
// Validates new password and confirmation match
// Validates password is at least 8 characters
// Calls supabase.auth.updateUser()
// Redirects to login on success
```

**Error Handling:**
- Empty field validation
- Password mismatch validation
- Password length validation
- Supabase API errors

## UI Components

### Sign In Page
- **Standard Sign In Form** - Email/password fields
- **"Forgot password?" Link** - Top right of password field
- **"Sign in with OTP instead" Link** - Bottom of form

### Forgot Password Form
- Email input field
- "Send Reset Link" button
- "Back to Sign In" button
- Informational text about recovery email

### OTP Authentication Form
- **First Screen:** Email input + "Send OTP" button
- **Second Screen:** 6-digit OTP input + "Verify OTP" button
- "Back" button to re-enter email
- "Cancel" button to return to sign in
- Numeric input only (auto-formatted)

### Password Reset Form (Recovery Mode)
- New password input (min 8 characters)
- Confirm password input
- "Update Password" button
- Password requirements help text

## Security Considerations

1. **Email Verification:** Password reset links are valid for a limited time (default 24 hours)
2. **OTP Expiration:** OTPs expire after a short period (default 10 minutes)
3. **One-Use Reset Links:** Reset links cannot be reused
4. **Session Security:** JWT tokens are used for authenticated requests
5. **HTTPS Required:** All password operations require HTTPS
6. **No Password Storage:** Passwords are never stored in localStorage

## Configuration

### Supabase Settings
The following must be configured in Supabase project:

1. **Auth Settings:**
   - Email provider configured
   - Email templates customized (optional)
   - Redirect URLs configured:
     - Recovery: `{YOUR_DOMAIN}/auth?mode=recovery`
     - Confirmation: `{YOUR_DOMAIN}/auth`

2. **Email Configuration:**
   - SMTP or SendGrid configured for email delivery
   - Email sender configured in settings

3. **OTP Settings:**
   - OTP provider enabled
   - OTP validity period configured (typically 10-15 minutes)

### Environment Variables
Add to `.env` if needed:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Testing

### Test Forgot Password Flow
1. Go to `/auth` page
2. Click "Forgot password?"
3. Enter test email
4. Click "Send Reset Link"
5. Check email for reset link
6. Click link in email
7. Should see password reset form
8. Enter new password and confirm
9. Click "Update Password"
10. Verify redirect to login
11. Log in with new password

### Test OTP Flow
1. Go to `/auth` page
2. Click "Sign in with OTP instead"
3. Enter email address
4. Click "Send OTP"
5. Check email for OTP code
6. Enter 6-digit code
7. Click "Verify OTP"
8. Should be logged in and redirected to dashboard

### Test Standard Sign In
1. Go to `/auth` page
2. Enter email and password
3. Click "Sign In"
4. Should be logged in and redirected to dashboard

## Troubleshooting

### Reset Email Not Received
- Check spam/junk folder
- Verify Supabase email configuration
- Check email service logs in Supabase dashboard
- Verify email address is associated with account

### OTP Not Received
- Check spam/junk folder
- Verify OTP hasn't expired (typically 10-15 minutes)
- Try sending again by going back and clicking "Send OTP"
- Verify Supabase OTP configuration

### Reset Link Not Working
- Link may have expired (typically 24 hours)
- Request a new reset link
- Verify correct URL format in redirect configuration

### Invalid OTP Error
- Verify you entered the correct 6 digits
- OTP is case-sensitive (numeric only)
- OTP may have expired
- Request a new OTP

## Future Enhancements

1. **Two-Factor Authentication (2FA):** Add optional 2FA using TOTP or SMS
2. **Passwordless Sign In:** Use magic links as default authentication
3. **Biometric Authentication:** Support fingerprint/face recognition on mobile
4. **Social Login:** Add OAuth providers (Google, GitHub, etc.)
5. **Session Management:** Add device management and logout other sessions
6. **Rate Limiting:** Add rate limiting to prevent brute force attacks
7. **Security Questions:** Add security questions as fallback recovery method

## Files Modified

- `src/pages/Auth.tsx` - Main authentication page with all handlers and UI components

## State Management

```typescript
// Forgot Password States
const [showForgotPassword, setShowForgotPassword] = useState(false);
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

// OTP States
const [showOtpAuth, setShowOtpAuth] = useState(false);
const [otpEmail, setOtpEmail] = useState("");
const [otp, setOtp] = useState("");
const [otpSent, setOtpSent] = useState(false);
const [otpLoading, setOtpLoading] = useState(false);

// Loading States
const [resetLoading, setResetLoading] = useState(false);
```

## API Methods Used

### Supabase Auth API
- `supabase.auth.resetPasswordForEmail(email, options)` - Send password reset email
- `supabase.auth.signInWithOtp(credentials)` - Initiate OTP sign-in
- `supabase.auth.verifyOtp(credentials)` - Verify OTP and create session
- `supabase.auth.updateUser(attributes)` - Update user password

All methods are part of the official Supabase JavaScript SDK and fully documented at https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
