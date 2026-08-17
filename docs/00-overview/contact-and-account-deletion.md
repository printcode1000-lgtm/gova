# Contact Us and Account Deletion

## Contact Us Page

- Public Route: `/contact-us`.
- Rebuilt within React and Next.js to align with Asol design, supporting both Arabic and English languages as well as RTL and LTR layouts.
- Retains phone numbers, email, Facebook, Instagram, and TikTok links, working hours, and the approved QR code from the legacy page.
- Sends the contact form submission to `suezbazaar@gmail.com` using the configured Gmail account from password recovery environment variables, setting the sender's email in `Reply-To`.
- Server validates name, email, service type, and message content, allowing up to 3 attempts per IP address per 15-minute window for each server instance.
- Endpoint: `POST /api/contact`.

## Account Deletion Page

- Public Route: `/delete-account`, accessible from the Contact Us page.
- UI lives in `src/features/auth/components/AccountDeletionPageContent.tsx`.
- Core deletion logic lives in `@asol/auth-core/server` (`AccountDeletionService`).
- Requires authentication, a signed `sessionToken` header, current password, exact confirmation text matching either `DELETE ASOL ACCOUNT` or `احذف حساب أصول نهائيا`, and approval of the final warning.
- Super Admin account cannot be deleted from this page.
- Endpoint: `POST /api/account/delete`.

### Permanently Deleted Data

- User record, password (scrypt), password recovery challenges, and device notification tokens.
- Profile, social links, addresses, photos, specialties, seller discounts, pharmacy catalog overrides, working hours, and associated settings.
- Products, product images, reviews, interactions, and followings owned by the user.
- Custom order images uploaded by the user from storage, with personal references scrubbed from the order record.
- Upon successful server response, the client clears local device data including session, cart, favorites, IndexedDB databases, and cookies.

### Retained Shared Records

Orders, payments, returns, disputes, and audit logs involve multiple parties and are therefore retained. The user ID is replaced with a static anonymous identifier derived from the UID hash, and personal addresses, notes, and payment details are stripped. This preserves accounting integrity and legal compliance without retaining deleted account identities.

### Operational Note

The deletion process spans user, profile, product, and order databases as well as image storage. Core data deletion executes in a sequential order that prevents active logins, while image removal handles per-file failures independently and logs errors for operational auditing.

### Implementation Reference

Auth and deletion orchestration live in `@asol/auth-core`. See [auth-core-module.md](../01-architecture/auth-core-module.md) for package boundaries, security model, and file map.
