
## Diagnosis (why the preview overlay is blank)
The preview overlay is rendering correctly (we can see the top “PT Coach Commission Report Preview” bar), but the report body is empty because **the report component is intentionally hidden on screen**.

In `src/components/PrintablePTReport.css` there is:

```css
/* Screen styles */
@media screen {
  .printable-pt-report {
    display: none;
  }
}
```

So even though the portal overlay is on screen, the `.printable-pt-report` inside it is forced to `display:none`, resulting in a blank white area.

---

## Fix Strategy
Make the PT report visible in the on-screen preview overlay while keeping printing behavior intact.

We will:
1) Remove the rule that hides `.printable-pt-report` on screen.
2) Add proper “screen preview” styles (white background, black text, padding) so the preview looks like the printed output.
3) Keep/retain `@media print` styles (either in this CSS file or via `src/index.css`) so printing stays correct.
4) (Optional but recommended) Add a wrapper class on the portal container (e.g. `print-preview`) and scope screen styles to that wrapper, to avoid accidentally showing the report elsewhere.

---

## Concrete Implementation Steps

### 1) Update `src/components/PrintablePTReport.css`
**A. Remove the on-screen hide block**:
Remove:
```css
@media screen {
  .printable-pt-report {
    display: none;
  }
}
```

**B. Add base styles for preview (applies on screen)**
Add non-print styles so it renders nicely in the overlay:
- `.printable-pt-report { display:block; background:#fff; color:#000; padding:20pt; font-family: Arial; font-size: 9pt; line-height:1.4; }`
- Add base styles for `.report-header`, `.summary-section`, `.sessions-table`, `.grand-total`, etc. (you can copy most of the existing print rules and place them outside `@media print` so preview matches print).

**C. Keep `@media print` overrides**
Leave the existing `@media print` section in place (or simplify it), ensuring the print layout remains correct.

### 2) (Optional but recommended) Update `src/pages/PTReport.tsx` overlay wrapper
In the portal overlay container, add a wrapper class like `print-preview`:
```tsx
<div className="fixed inset-0 ... print-root print-preview">
```

Then, if you prefer tighter scoping, you can write screen CSS like:
```css
.print-preview .printable-pt-report { display:block; }
```
This ensures the report only shows in the preview overlay and not accidentally elsewhere.

---

## Validation Checklist (what we will verify after the change)
1) Click “Print Report” → overlay opens → report content (header, summary, table OR “No PT sessions found…”) is visible immediately.
2) If there is no data, the “No PT sessions found…” message appears (not blank).
3) Click “Print Now” → print dialog shows report content (not blank).
4) Close button still closes preview manually.

---

## Files to change
- `src/components/PrintablePTReport.css` (required)
- `src/pages/PTReport.tsx` (optional small className addition for scoping)

