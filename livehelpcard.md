🧑‍💻 Live Help Purchases
Overview

Live Help sessions are treated like premium content, but instead of unlocking a single item, the user buys a number of hours. These hours accumulate as a balance that the dashboard shows under “Total Live Help Purchased.”

Flow

Frontend (ContentTabs.js)

Shows a special Live Help Session card in the Explore tab.

User chooses a number of hours (1–5) via a dropdown.

Purchase request is sent to POST /api/buy/live_help with { quantity } and (optionally) { session_id }.

Backend (routes/buy.js)

Handles live_help as a special case.

Creates a Stripe Checkout session where unit_amount = price per hour and quantity = hours selected.

Metadata is attached (type: live_help, hours, user_id, etc.).

Confirmation (routes/confirmPayment.js)

Called after Stripe redirects back with ?status=success&session_id=....

Verifies the Stripe session is paid.

Inserts a row into live_help_purchases with user_id, stripe_session_id, hours, and amount_cents.

Uses a unique constraint on stripe_session_id and ON CONFLICT DO NOTHING to make the operation idempotent (so refreshes don’t double-count).

If inserted, also increments user_live_help_totals.hours_total.

Fetching (routes/liveHelpHour.js)

Returns upcoming live_help_hours (time slots, capacity).

Also queries user_live_help_totals (or falls back to summing live_help_purchases) to return totalHours.

Dashboard displays Total Live Help Purchased: X hours.

Tables

live_help_purchases

One row per paid Stripe session (stripe_session_id is UNIQUE).

Useful for auditing exact purchases.

user_live_help_totals

One row per user.

Keeps a running sum of hours purchased.

Keeps /api/live-help-hour lightweight (no aggregation every request).

Key Notes

Idempotency is critical: only the first confirm for a Stripe session increments totals.

The dashboard shows lifetime hours purchased. If you ever want “remaining balance,” you’ll need a live_help_redemptions table that tracks hours actually booked/consumed.

All logic works even if /api/confirm-payment is retried multiple times.