# Maigon Edge (Supabase Functions)

## Setup
- Secrets in Supabase: `SUPA_URL`, `SUPA_SERVICE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Deploy: `supabase db push` then `supabase functions deploy`

## Functions
- POST /createReview
- POST /createCheckout
- POST /stripeWebhook
- GET  /getUsageStats
- GET  /adminStats
- POST /createCustomPlan
