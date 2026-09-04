import "./ui/styles/index.css";
import { APP_CONFIG } from "./config/app";
import { TalkApp } from "./ui/talkApp";
import { trackViewport } from "./ui/viewport";

document.querySelector<HTMLImageElement>(".studio-splash-cover")!.src = APP_CONFIG.assets.studioSplash;
document.querySelector<HTMLImageElement>(".splash-cover")!.src = APP_CONFIG.assets.splash;
document.querySelector<HTMLImageElement>(".brand-mark")!.src = APP_CONFIG.assets.logo;
trackViewport();
new TalkApp();
