/**
 * Storybook's stand-in for lib/demoMode.ts (see sb.mock in .storybook/preview.tsx): demo mode is off
 * in every story, also when .env.local sets VITE_DEMO=true. Stories turn it on with setMockDemo.
 */

// Kept on globalThis: the story and the app may load this file as two module instances.
const state = globalThis as { storyDemo?: boolean };

/** Whether the next story shows the demo site. */
export function setMockDemo(on: boolean) {
  state.storyDemo = on;
}

export const isDemo = () => state.storyDemo ?? false;
