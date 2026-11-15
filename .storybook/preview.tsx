import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true },
    layout: "padded",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    options: { storySort: { order: ["UI", "Patterns"] } },
    viewport: {
      options: {
        desktop: { name: "PC 1280px", styles: { width: "1280px", height: "900px" }, type: "desktop" },
        tablet: { name: "タブレット 768px", styles: { width: "768px", height: "1024px" }, type: "tablet" },
        mobile: { name: "スマートフォン 390px", styles: { width: "390px", height: "844px" }, type: "mobile" },
        narrow: { name: "狭い画面 320px", styles: { width: "320px", height: "640px" }, type: "mobile" },
      },
    },
    docs: { codePanel: true },
  },
  beforeEach() {
    document.documentElement.lang = "ja";
  },
};

export default preview;
