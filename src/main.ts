import "./ui/styles/index.css";
import { APP_CONFIG } from "./config/app";
import { GAME_IMAGE_URLS } from "./content/puzzles";
import { preloadImages } from "./ui/imagePreloader";
import { TalkApp } from "./ui/talkApp";
import { trackViewport } from "./ui/viewport";

document.title = APP_CONFIG.name;
const studioSplash = document.querySelector<HTMLImageElement>(".studio-splash-cover");
if (studioSplash) studioSplash.src = APP_CONFIG.assets.studioSplash;
const productCover = document.querySelector<HTMLImageElement>("#product-cover");
if (productCover) productCover.src = APP_CONFIG.assets.productCover;
const productLogo = document.querySelector<HTMLImageElement>("#brand-mark");
if (productLogo) productLogo.src = APP_CONFIG.assets.productLogo;
trackViewport();
new TalkApp();

const warmGameImages = (): void => { void preloadImages(GAME_IMAGE_URLS); };
if (document.readyState === "complete") warmGameImages();
else window.addEventListener("load", warmGameImages, { once: true });
