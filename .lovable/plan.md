
Goal: fix the renewal flow on `/members` so renewing a membership cannot send an empty zone to the backend.

What I found:
- The current renewal error is coming from `Members.tsx` during the “deactivate old service” step.
- Console logs show: `invalid input value for enum zone_type: ""`.
- That means `formData.zone` is still an empty string when `handleRenewalSubmit` runs.
- The renew dialog uses custom `Select` components. Their `required` prop does not reliably block form submission like a native `<select>`, so the form can submit with blank `zone` / `subscription_plan`.
- Session replay matches this: the user entered an amount and clicked renew, but no valid zone was enforced before submit.

Plan

1. Harden renewal validation in `src/pages/Members.tsx`
- Add explicit early validation inside `handleRenewalSubmit` for:
  - selected member exists
  - `formData.zone` is non-empty
  - `formData.subscription_plan` is non-empty
  - PT renewals require coach when needed
  - at least one valid payment entry
- Show a clear toast like “Please select a zone and subscription plan before renewing”.
- Return before any database call if validation fails.

2. Pre-fill the renew dialog with the member’s latest service
- Update `handleRenewMembership` to set sensible defaults from the member’s most recent service:
  - default `zone`
  - default `subscription_plan`
  - default `coach_name` for PT
- This reduces operator mistakes and makes renewing faster.

3. Prevent invalid submit from the UI
- Disable the renew submit button until the required renewal fields are present.
- Optionally add inline helper text / warning state when zone or plan is missing.
- Keep the payment total behavior unchanged.

4. Make the renewal logic safer around service deactivation
- Only run the “deactivate old service in same zone” query after validation passes.
- Use the validated zone value consistently for:
  - old service deactivation
  - new `member_services` insert
  - `payment_receipts` insert

5. Check the same issue in “Add Service”
- `handleAddServiceSubmit` uses the same pattern (`formData.zone as any`), so I’ll apply the same protection there to avoid the exact same enum error in that flow.

Files to update
- `src/pages/Members.tsx` — root fix for renewal and add-service validation

Technical details
- Root cause: empty string `""` is being cast and sent to a Postgres enum field (`zone_type`), which rejects it.
- The fix is not in the database; it is in client-side form handling and submit guards.
- This is a runtime validation gap, not an authentication or RLS issue.

Expected result after implementation
- Renewing without choosing required values will show a friendly validation toast instead of crashing.
- Renewing with valid inputs will complete successfully.
- The same invalid-zone bug will also be prevented in the add-service flow.
