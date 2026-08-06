import { mount } from "svelte";
import App from "./App.svelte";
import type { ReviewPayload } from "../../src/payload";
import "./app.css";

declare global {
  interface Window {
    __REVIEW_DATA__?: ReviewPayload;
  }
}

const payload = window.__REVIEW_DATA__;
if (!payload) throw new Error("semantic-review: window.__REVIEW_DATA__ is missing");

mount(App, { target: document.getElementById("app")!, props: { payload } });
