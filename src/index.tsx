/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import App from "./App.tsx";
import { applyTheme } from "./lib/theme.ts";

const root = document.getElementById("root");

render(() => {
  // Here rather than in App, so Storybook's theme toolbar isn't overruled in the Screens stories.
  applyTheme();
  return <App />;
}, root!);
