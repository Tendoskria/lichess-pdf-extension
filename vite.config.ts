import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig(({ mode }) => {
  const isContent = mode === "content"

  return {
    build: {
      outDir: "dist",
      emptyOutDir: false,
      rollupOptions: {
        input: isContent
          ? resolve(__dirname, "src/content/index.ts")
          : resolve(__dirname, "src/background/index.ts"),

        output: {
          entryFileNames: isContent ? "content.js" : "background.js",
          format: "iife",
        }
      }
    }
  }
})