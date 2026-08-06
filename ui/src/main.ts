import { mount } from "svelte";
import App from "./App.svelte";
import type { ReviewPayload } from "../../src/payload.ts";
import { applyThemeDataset, readThemeFromStorage } from "./helpers.ts";
import "./app.css";

declare global {
  interface Window {
    __REVIEW_DATA__?: ReviewPayload;
  }
}

// No-flash theme: apply stored choice before first paint of the app.
const stored = readThemeFromStorage((k) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
});
applyThemeDataset(document.documentElement, stored);

const payload = window.__REVIEW_DATA__;
if (!payload) throw new Error("semantic-review: window.__REVIEW_DATA__ is missing");

mount(App, { target: document.getElementById("app")!, props: { payload } });
