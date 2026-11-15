import type { StorybookConfig } from "@storybook/nextjs-vite";
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../components/ui/**/*.stories.tsx", "../stories/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  core: { disableTelemetry: true },
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: { alias: { "@": fileURLToPath(new URL("../", import.meta.url)) } },
      server: { watch: { ignored: ["**/.next/**", "**/.next-dev/**", "**/.next-check/**", "**/.tmp/**", "**/storybook-static/**"] } },
    });
  },
};

export default config;
