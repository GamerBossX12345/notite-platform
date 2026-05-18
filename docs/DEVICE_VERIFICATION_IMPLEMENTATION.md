# Admin Device Verification Feature - Implementation Complete

## Summary
This feature adds a security layer for admin accounts. If an admin hasn't logged in from a specific device within a configurable number of days (default: 7), they must verify their identity via email before accessing the admin panel.

## Files Modified

### Backend
1. **prisma/schema.prisma** - Added DeviceLogin model
2. **src/services/auth.service.js** - Added device verification logic
3. **src/controllers/auth.controller.js** - Added device verification endpoint handler
4. **src/routes/auth.routes.js** - Added /verify-device route
5. **src/controllers/systemConfig.controller.js** - Added validation for adminDeviceVerificationDays setting

### Frontend
1. **frontend/src/pages/AdminPage.jsx** - Added UI for configuring device verification days
2. **frontend/src/pages/LoginPage.jsx** - Added device verification prompt
3. **frontend/src/pages/VerifyDevicePage.jsx** - New page for device verification
4. **frontend/src/App.jsx** - Added /verify-device route

## Database Setup

Run the migration to create the DeviceLogin table:

```bash
cd backend
npm run prisma:migrate -- --name add_device_login
```

Or if that fails, use the helper script:
```bash
node prisma/apply_device_migration.js
```

The migration creates:
- DeviceLogin table with device fingerprint tracking
- Unique constraint on (userId, deviceFingerprint)
- Indexes for efficient queries

## How It Works

1. **Device Identification**: When an admin logs in, the system creates a fingerprint using user agent + IP address
2. **Threshold Check**: The system checks if the admin has logged in from that device within x days
3. **Verification**: If threshold exceeded, system sends verification email instead of granting access
4. **Configuration**: Head admin can set the threshold (1-365 days) in Admin > System settings
5. **Verification Flow**: Admin clicks email link to verify device access

## Configuration

Head admins can configure the feature via the Admin panel:
- Navigate to Admin > System tab
- Set "Zile de inactivitate pe dispozitiv înainte de verificare" (Days of inactivity before verification)
- Default: 7 days
- Range: 1-365 days

## API Endpoints

### New Endpoints
- `GET /api/auth/verify-device?token=XXX` - Verify device login via token
- Modified `POST /api/auth/login` - Now accepts userAgent and ipAddress from request headers

### System Config
- `GET /api/admin/system-config` - Returns config including adminDeviceVerificationDays
- `PATCH /api/admin/system-config` - Update device verification days setting

## Error Codes

When device verification is required, login returns 403 with:
```json
{
  "code": "DEVICE_VERIFICATION_REQUIRED",
  "error": "Trebuie să verifici accesul din acest dispozitiv. Verifică-ți emailul."
}
```

## Frontend Flow

1. Admin enters credentials on LoginPage
2. If device verification required:
   - Error message shows
   - System sends verification email
   - User sees message to check email
3. Admin clicks verification link in email
4. Redirected to /verify-device route
5. Device gets marked as verified
6. Admin can now login normally

## Testing Checklist

- [ ] Create test admin account
- [ ] Login from new device (different browser/IP)
- [ ] Verify email is sent
- [ ] Click verification link in email
- [ ] Verify device is now trusted
- [ ] Change device verification days setting
- [ ] Test with different thresholds
- [ ] Verify normal users are unaffected

## Notes

- Only ADMIN and HEAD_ADMIN roles are affected
- Device fingerprint combines user agent + IP address (sha256 hash)
- Each device-admin combination has a separate verification timestamp
- Verification email uses the same template system as registration verification
- The verifiedAt timestamp is updated when device is first verified
