// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

const LOVABLE_CLOUD_URL = "https://xelcsqiixrrbwsegqpmb.supabase.co";
const LOVABLE_CLOUD_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbGNzcWlpeHJyYndzZWdxcG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNzMyMzksImV4cCI6MjA5Mzg0OTIzOX0.L0bOlxhw5XrkTREXpbbtIiEdfBJsy-IdK4ay1zW8AVE";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(LOVABLE_CLOUD_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        LOVABLE_CLOUD_PUBLISHABLE_KEY,
      ),
    },
    plugins: [mcpPlugin()],
  },
});
