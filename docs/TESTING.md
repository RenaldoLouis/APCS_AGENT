# Automated Testing with Playwright

We use Playwright for end-to-end (E2E) testing, particularly to verify complex flows such as the multi-step registration forms, ensemble discount logic, and invoice generation.

## How to Run the Registration Tests

If you need to test the registration flow (e.g., verifying if the ensemble discount calculates correctly or invoices are generated properly), you can run the automated script.

**Important**: Make sure your terminal is inside the `apcs_web` directory.

### Run in Headed Mode (Recommended)
This will open a visible browser window so you can see the bot filling out the form, and you can manually solve the Google ReCAPTCHA.

```bash
cd apcs_web
yarn playwright test e2e/register.spec.js --headed
```

### What the script does:
1. **Case 1: Single Performer**. Fills out standard registration for a single piano soloist.
2. **Case 2: Ensemble 5 People**. Fills out registration for a 5-person piano ensemble to test general ensemble discounts.
3. **Case 3: Vocal Choir Ensemble 12 People**. Fills out registration for a 12-person vocal choir to test specific group invoice thresholds (e.g. generating 3 separate invoices if the limit is exceeded).

### Handling the ReCAPTCHA:
Google ReCAPTCHA blocks fully automated bots. The script will try to automatically click the "I am not a robot" checkbox. 
- If it works automatically, the script will instantly submit the form.
- If it prompts with a puzzle (select all cars, etc.), **the script will pause and wait**. You must manually solve the image puzzle and click the "Submit Registration" button yourself. The script will then resume automatically to verify the invoice link opens.
