# Automated Testing with Playwright

We use Playwright for end-to-end (E2E) testing, particularly to verify complex flows such as the multi-step registration forms, ensemble discount logic, and invoice generation.

## How to Run the Registration Tests

If you need to test the registration flow (e.g., verifying if the ensemble discount calculates correctly or invoices are generated properly), you can run the automated script.

**Important**: Make sure your terminal is inside the `apcs_web` directory.

### Run in Headed Mode (Recommended)
This will open a visible browser window so you can see the bot filling out the form, and you can manually solve the Google ReCAPTCHA.

```bash
cd apcs_web
# To test standard registration flows:
yarn playwright test e2e/register.spec.js --headed

# To test specific Vocal Choir discount tiers (5%, 15%, 20%):
yarn playwright test e2e/vocal-choir-discount.spec.js --headed
```

### What the `register.spec.js` script does:
1. **Case 1: Single Performer**. Fills out standard registration for a single piano soloist.
2. **Case 2: Ensemble 5 People**. Fills out registration for a 5-person piano ensemble to test general ensemble discounts.
3. **Case 3: Vocal Choir Ensemble 12 People**. Fills out registration for a 12-person vocal choir to test specific group invoice thresholds (e.g. generating 3 separate invoices if the limit is exceeded).

### What the `vocal-choir-discount.spec.js` script does:
Specifically targets the Vocal Choir discount logic at different tier sizes:
1. **Case 1: 5 People**. (5-10 tier -> 5% discount)
2. **Case 2: 15 People**. (11-20 tier -> 15% discount)
3. **Case 3: 25 People**. (21-30 tier -> 20% discount)

### Handling the ReCAPTCHA:
Google ReCAPTCHA blocks fully automated bots. To prevent scrolling issues and ensure smooth testing:
- The script will **not** attempt to automatically click the ReCAPTCHA or Submit button.
- Instead, the script will fill out the entire form, pause, and wait for you.
- You must **manually solve the ReCAPTCHA** and click the **"Submit Registration"** button yourself. 
- The script will then resume automatically to verify the invoice link opens and leave the invoice tab open for your inspection.
