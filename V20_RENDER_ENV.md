# V20 Render setup

Keep existing Firebase and Gemini variables. Add Razorpay variables only when ready:

```text
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_PLUS_PLAN_ID=
RAZORPAY_PRO_PLAN_ID=
RAZORPAY_WEBHOOK_SECRET=
```

Payment stays disabled when these are absent. Never put Razorpay secret values in `script.js` or frontend HTML.
