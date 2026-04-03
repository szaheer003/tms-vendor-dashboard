/**
 * Static export: `redirect()` produces a broken root HTML (`__next_error__`).
 * Re-use Overview so "/" loads real content and data hydrates normally.
 */
export { default } from "./overview/page";
