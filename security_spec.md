# Security Specification - Goa Cruise Haven

## Data Invariants
1. A booking must have a valid `userId` matching the authenticated user.
2. A booking must reference an existing `cruiseId`.
3. Only admins can create/update/delete `cruises`.
4. Users can only read their own `bookings`.
5. Admins can read all `bookings`.
6. User roles are immutable by the user themselves.

## The Dirty Dozen Payloads (Rejection Tests)
1. **Identity Spoofing**: Creating a booking with another user's `userId`.
2. **Privilege Escalation**: Updating own user document to set `role: 'admin'`.
3. **Price Manipulation**: Creating a booking with a `totalAmount` of 0.
4. **ID Poisoning**: Using a 2KB string as a `cruiseId`.
5. **Orphaned Writes**: Creating a booking for a `cruiseId` that doesn't exist.
6. **State Shortcut**: Updating a booking status directly to 'confirmed' without a payment ID.
7. **Shadow Update**: Adding an `isVerified: true` field to a cruise document as a non-admin.
8. **Malicious Date**: Setting `date` to a string like "NOT_A_DATE".
9. **Quantity Abuse**: Booking -1 or 1,000,000 tickets.
10. **PII Leak**: A user reading another user's profile containing email.
11. **Timestamp Forgery**: Proving `createdAt` into the future.
12. **Blanket List**: Attempting to list all users as a standard customer.

## Test Strategy
- Verify `isValidCruise` on all `cruises` writes.
- Verify `isValidBooking` on all `bookings` writes.
- Verify `isOwner` or `isAdmin` for all read access.
