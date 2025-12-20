# Website Audit Report

This report details findings from an audit of the website, focusing on HTML structure, accessibility, performance, and code quality.

## `index.html`

### Overall
`index.html` is well-structured and demonstrates good practices, especially in SEO and performance. The identified issues are minor but could be addressed for further improvement.

### Findings

#### Performance
*   **Cache-busting:** The file `json/posts.json` is fetched with a `Date.now()` timestamp (`?v=...`). This prevents the browser from ever caching the file, forcing a new download on every visit. For a list of posts that doesn't change every second, a different caching strategy would be more efficient (e.g., version number, content hash, or relying on server cache headers).

#### Accessibility
*   **Redundant `aria-label`:** The element `<div class="page-title" aria-label="Page title">` has an `aria-label` that is less descriptive than its text content ("Announcements"). Screen readers will read "Page title" instead of "Announcements". The `aria-label` should be removed to allow the screen reader to announce the actual text content.
*   **Loading State:** The loading skeleton placeholders do not inform screen reader users that content is loading. Consider adding `aria-busy="true"` to the container while content is being loaded.

#### Code Quality
*   **Inline Styles:** There are several instances of inline `style` attributes for setting `min-height` and `height`. While sometimes necessary, these are better placed in a CSS file to improve maintainability and content/presentation separation.
*   **HTML Comments:** Comments indicating component boundaries (e.g., `<!-- COMPONENT: components/head-meta.html -->`) are present in the final HTML. A build process could remove these to slightly reduce the page size.

---

## `components/head-meta.html`

### Overall

This component contains common meta tags, icons, and performance hints. It is well-structured and adheres to modern web development best practices.

### Findings

No issues were found in this file. The use of multiple icon formats, a web manifest, and `preconnect` hints for critical domains are all excellent practices.

---

## Build Process (`scripts/build.js`)

An analysis of the `scripts/build.js` file reveals that the project uses a custom Node.js script to build the website. This script:
1.  Creates a `dist` directory for the final site.
2.  Copies asset directories (`css`, `js`, `images`, etc.) to the `dist` folder.
3.  Processes all `.html` files in the root directory. It finds special comments (`<!-- COMPONENT: path/to/component.html -->`) and replaces them with the content of the specified component file.

This process is why issues should be fixed in the source files in the root directory, not in a `dist` folder.

The inconsistencies noted between `index.html` and `financials.html` (e.g., CSS loading strategy, missing meta tags) are **not** caused by this build script. They are present in the source HTML files themselves, indicating a lack of a standardized template or approach for creating new pages.

---

## `financials.html`

### Overall

This page appears to be a dynamic, data-heavy dashboard. It has a good structure for JavaScript-driven content but has several significant issues regarding SEO, performance, and accessibility.

### Findings

#### SEO
*   **Critical - Missing Title and Description:** The page is missing a `<title>` tag and a `<meta name="description">` tag. This is very bad for SEO and user experience. Each page must have its own unique, descriptive title and description.

#### Performance
*   **Render-Blocking CSS:** The CSS files are loaded using standard `<link rel="stylesheet">` tags in the `<head>`. This blocks rendering. The asynchronous loading pattern (`preload`/`onload`) used in `index.html` should be applied here for better-perceived load performance.

#### Accessibility
*   **Redundant `aria-label`:** Similar to `index.html`, the element with the text "Numbers" has an `aria-label="Page title"`, which is less descriptive. The `aria-label` should be removed.
*   **Decorative Icons:** Icons inside buttons and headings (using `data-lucide`) are not explicitly hidden from screen readers with `aria-hidden="true"`. This can lead to screen readers announcing unhelpful icon names.
*   **Modal Accessibility:** The chart modal (`#chartModal`) is missing key attributes for accessibility. It should have `role="dialog"`, `aria-modal="true"`, and an accessible name (e.g., `aria-labelledby="modal-title"`). Focus should also be trapped within the modal when it is open.
*   **Modal Close Button:** The close button (`&times;`) should have an `aria-label` (e.g., `aria-label="Close"`) to be more descriptive for screen reader users.

#### HTML & Code Quality
*   **Scroll Anchor:** An empty `<div>` is used as an anchor for scrolling. The `scroll-margin-top` CSS property on the target element is a more modern and cleaner solution.
*   **Inline Styles:** Use of inline styles for margins. These should be in a CSS file.
*   **Inconsistent Component Usage:** The page has comments for components (`<!-- COMPONENT: ... -->`) but it seems the `components/fonts.html` was not properly "included", and crucial meta tags are missing, suggesting a potential issue in the build process for this page.

---

## `news.html`

### Overall
The `news.html` page is well-structured from an SEO and metadata perspective, providing a good template for other pages. However, it shares some of the same performance and accessibility issues found elsewhere.

### Findings

#### SEO
*   **Good:** This page includes a unique `<title>`, `<meta name="description">`, and other important meta tags for social sharing. This is excellent and should be the standard for all pages.

#### Performance
*   **Render-Blocking CSS:** Like `financials.html`, this page uses standard render-blocking `<link rel="stylesheet">` tags. The asynchronous loading pattern from `index.html` should be used here to improve performance.

#### Accessibility
*   **Redundant `aria-label`:** The page title element has an `aria-label="Page title"`, which is less descriptive than its text content ("News"). This should be removed.
*   **Decorative Icons:** Icons inside the page title and filter buttons are not explicitly hidden with `aria-hidden="true"`, which can create noise for screen reader users.

---

## `journal.html`

### Overall
This page is also in good shape regarding SEO metadata. It uses a different, but still effective, method for async CSS loading. The primary issues are a lack of a visible loading state and the same minor accessibility issue seen on other pages.

### Findings

#### SEO
*   **Good:** This page has unique and descriptive titles and meta tags.

#### Performance
*   **Inconsistent CSS Loading:** This page uses a mix of render-blocking and asynchronously loaded CSS (`media="print"` with `onload`). While the async loading is good, the site should standardize on a single, effective method (like the `rel="preload"` pattern in `index.html`) for all non-critical CSS across all pages to simplify maintenance and ensure consistent performance.

#### Accessibility
*   **Redundant `aria-label`:** The page title element has `aria-label="Page title"`, which should be removed.

#### User Experience
*   **No Loading State:** The main content area is an empty `<div id="journal-feed"></div>`. This can appear as a blank space until the JavaScript loads and populates the content. A loading message or skeleton screen, as seen on other pages, should be included in the initial HTML to improve perceived performance and provide user feedback.

---

## Summary and Recommendations

The website is generally well-built, with a clear structure and good use of modern web features. However, the audit revealed several inconsistencies and recurring issues across different pages. Addressing these would improve performance, accessibility, SEO, and maintainability.

The core of the problem seems to be a lack of a standardized template or set of guidelines for creating new pages. This has led to different pages being implemented in slightly different ways, causing the issues detailed in this report.

### High Priority Recommendations

1.  **Standardize Page Templates for SEO:**
    *   **Action:** Ensure every HTML page has a unique and descriptive `<title>` and `<meta name="description">`.
    *   **Reason:** The `financials.html` page is critically missing these tags, which is very harmful to SEO and user experience. All pages should follow the excellent example set by `news.html` and `journal.html`.

2.  **Standardize CSS Loading for Performance:**
    *   **Action:** Choose one method for loading non-critical CSS and apply it consistently across all pages. The pattern used in `index.html` is a great choice:
        ```html
        <link rel="preload" href="path/to/style.css" as="style" onload="this.rel='stylesheet'">
        ```
    *   **Reason:** Currently, `financials.html` and `news.html` have render-blocking CSS, which slows down page load. A consistent, asynchronous approach will improve performance across the site.

### Medium Priority Recommendations

3.  **Fix Recurring Accessibility Issues:**
    *   **Action:**
        1.  Remove the redundant `aria-label="Page title"` from all `div.page-title` elements.
        2.  Add `aria-hidden="true"` to all purely decorative icons (e.g., the icons in page titles and filter buttons).
    *   **Reason:** These changes will reduce noise and confusion for screen reader users with minimal effort.

4.  **Provide Consistent Loading States:**
    *   **Action:** For pages that load content dynamically with JavaScript (like `journal.html`), include a loading indicator (text or a skeleton UI) in the initial HTML.
    *   **Reason:** This improves the user experience by providing immediate feedback that content is on its way, preventing a "flash of blank content." `index.html` and `news.html` already do this well.

### Low Priority / Code Quality Recommendations

5.  **Refactor Inline Styles and Scroll Anchors:**
    *   **Action:** Move inline `style` attributes into CSS files and replace the empty `div` anchor in `financials.html` with the `scroll-margin-top` CSS property.
    *   **Reason:** This will make the code cleaner, more maintainable, and improve the separation of concerns.

6.  **Optimize Build Process:**
    *   **Action:** Consider adding a step to the `scripts/build.js` script to remove the `<!-- COMPONENT: ... -->` comments from the final HTML files in the `dist` directory.
    *   **Reason:** This is a micro-optimization that will slightly reduce the size of the HTML files.
