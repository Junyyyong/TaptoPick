import "./ui/styles/index.css";
import { APP_CONFIG } from "./config/app";
import { TalkApp } from "./ui/talkApp";
import { trackViewport } from "./ui/viewport";

document.title = APP_CONFIG.name;
const studioSplash = document.querySelector<HTMLImageElement>(".studio-splash-cover");
if (studioSplash) studioSplash.src = APP_CONFIG.assets.studioSplash;
trackViewport();
new TalkApp();
