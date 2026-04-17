## 2025-03-05 - Accessibility improvements for dynamic states and toggles
**Learning:** For Single Page App tab-switchers, `aria-current="true"` (or using `role="tab"` with `aria-selected="true"`) is slightly more semantically accurate than `aria-current="page"` when updating the active tab to screen readers, though both work.
**Action:** Use `aria-current="true"` when indicating active tabs in a UI that doesn't navigate to a new page.
