import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.junyyyong.taptotalk",
  appName: "TAP to TALK",
  webDir: "dist",
  // Matches --wood-mid so the window never flashes white behind the WebView.
  backgroundColor: "#7a4f24",
  android: {
    backgroundColor: "#7a4f24",
  },
};

export default config;
