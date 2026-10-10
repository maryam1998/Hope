// پوشش localStorage
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// Plain localStorage wrapper — works in any real browser (deployed site, PWA
// on a phone, etc). `window.storage` from the Claude preview environment
// does NOT exist once this app is deployed on its own, so we don't rely on it.
export const storage = {
  async get(key) {
    try {
      const v = window.localStorage.getItem(key);
      return v == null ? null : { value: v };
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return { value };
    } catch (e) {
      return null;
    }
  },
};
