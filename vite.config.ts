import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

const config = defineConfig({
  base: "/webgpu-particles/",
  server: {
    port: 8888,
  },
  plugins: [glsl()],
});

export default config;
