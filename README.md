# RedotsClub Global Playbook

Interactive playbook website for RedotsClub country leads.

## Features

- 5 pillars, 17 articles
- EN/PT language toggle
- 20-question quiz (15 MC + 5 scenario)
- Quiz results emailed to lucas@redotpay.com
- RedotsClub branded (forest green + gold)
- Mobile responsive

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import repo
3. Framework: Next.js (auto-detected)
4. Deploy

## EmailJS Setup (for quiz email submission)

To enable quiz email delivery:
1. Create account at emailjs.com
2. Create a service (Gmail recommended)
3. Create a template with these variables:
   - `to_email`, `from_name`, `from_country`, `reply_to`, `score`, `body`
4. Update `service_id`, `template_id`, `user_id` in `pages/index.js`

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000
