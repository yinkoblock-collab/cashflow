# Security Specification & Test Suite

## 1. Data Invariants
- Invariant 1 (Identity Integrity): A user can only access, create, update, or read documents linked to their own `businessId` or `userId`.
- Invariant 2 (PII Isolation): User document `/users/{userId}` can only be read and written by `request.auth.uid == userId`.
- Invariant 3 (Balance & Session Integrity): Transactions and dailySessions cannot be forged with foreign business IDs.
- Invariant 4 (Terminal State Locking): Closed sessions cannot be modified once `status == 'closed'` except by authorized owners.
- Invariant 5 (Immutability): Core fields `id`, `businessId`, `createdAt` are immutable after creation.
- Invariant 6 (Type & Range Integrity): Amounts, charges, and balances must be numbers; strings must have bounded lengths.

## 2. The Dirty Dozen Payloads (Forbidden Actions)
1. **Unauthenticated Read**: Attempting to read `/businesses/{businessId}` without logging in.
2. **Cross-Tenant Business Read**: User A reading `/businesses/{businessB}` where ownerId is User B.
3. **Cross-Tenant Transaction Injection**: Inserting a transaction into `/transactions/{id}` with another user's `businessId`.
4. **ID Poisoning Attack**: Passing a document ID containing special injection characters or exceeding 128 characters.
5. **PII Hijacking**: Attempting to read another user's `/users/{otherUid}` profile.
6. **Closed Session Tampering**: Modifying `openingCash` on a `DailySession` whose status is already `'closed'`.
7. **Negative or Non-numeric Amount**: Injecting `{ "transactionAmount": "fifty thousand" }` into a transaction.
8. **Shadow Field Injection**: Injecting unexpected internal fields `{ "isSuperAdmin": true }` into a user or transaction document.
9. **Blanket Query Scraping**: Attempting `list` on `/transactions` without filtering by authorized `businessId`.
10. **Debt Status Manipulation**: Overwriting a debt record without belonging to the owning business.
11. **Immutability Breach**: Updating a transaction's `createdAt` or `businessId`.
12. **Foreign Expense Creation**: Adding expenses under a business ID the user does not own or attend.
