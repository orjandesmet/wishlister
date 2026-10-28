/**
 * Whether this is the demo site (see lib/demo.ts). Its own module and a function, so Storybook
 * can switch it per story (src/lib/__mocks__/demoMode.ts), whatever VITE_DEMO says.
 */
export const isDemo = () => import.meta.env.VITE_DEMO === "true";
