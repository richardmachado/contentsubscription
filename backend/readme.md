.env file should have these variables

PORT=5000
JWT_SECRET=supersecretkey (or whatever you want)
DATABASE_URL=postgres://mycomputer@localhost:5432/myappdb (i used postgres on local machine)
DOMAIN=http://localhost:3000

these are just for testing while developing and no credit cards are charged, once you go live, you switch to real Stripe secret keys

STRIPE*SECRET=sk_test... (should start with sk)
STRIPE_WEBHOOK_SECRET=whsec*...(when you run command "
stripe listen --forward-to localhost:5000/webhook
" on your terminal, it will give you this webhook secret)

