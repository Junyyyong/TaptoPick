import { PRACTICE_EXAMPLES } from "../content/pickTutorial";
import { PracticeRun } from "../core/pick/tutorial";
import { feedback } from "./feedback";

/** Guided practice has no game clock or shared game state. */
export function mountPickTutorial(root: HTMLElement): () => void {
  const panel = root.closest(".help-panel")!;
  panel.classList.add("visual-practice-panel");
  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  const cancelPreview = (): void => { generation++; clearTimeout(previewTimer); };
  const finish = (): void => { root.dispatchEvent(new CustomEvent("practice-done")); };
  const render = (step: number): void => {
    cancelPreview();
    const currentGeneration = generation;
    const example = PRACTICE_EXAMPLES[step]!;
    let previewing = example.mode === "memory";
    const run = new PracticeRun(example.mode, example.tiles);
    root.innerHTML = `<div class="visual-practice${previewing ? " is-memory" : ""}"><header class="visual-practice-head"><nav class="visual-practice-dots" aria-label="Practice steps"></nav><button type="button" class="text-btn" data-skip>Skip</button></header><h3>${example.title}</h3><p class="practice-sr-only">${example.instruction} Follow the highlighted button.</p>${example.preview ? '<div class="visual-practice-preview"></div>' : ''}<div class="practice-board" aria-label="Guided practice board"></div><footer class="visual-practice-foot"><p class="practice-status" role="status" aria-live="polite"></p><div class="visual-practice-actions"><button type="button" class="wood-btn" data-next>${step===2?"Done":"Next"}</button></div></footer></div>`;
    PRACTICE_EXAMPLES.forEach((entry,i)=>{
      const button=document.createElement("button");button.type="button";
      button.className=`visual-practice-dot${i===step?" is-current":i<step?" is-done":""}`;
      button.setAttribute("aria-label",`${i+1}. ${entry.title}`);button.setAttribute("aria-current",String(i===step));
      button.dataset.practiceMode=entry.mode;button.addEventListener("click",()=>render(i));root.querySelector(".visual-practice-dots")!.append(button);
    });
    const preview=root.querySelector(".visual-practice-preview")!;
    if(example.preview){const img=new Image();img.src=example.preview;img.alt=example.name!;preview.append(img);}
    const next=root.querySelector<HTMLButtonElement>("[data-next]")!;
    const status=root.querySelector<HTMLElement>(".practice-status")!;
    const buttons=run.tiles.map((tile,index)=>{
      const button=document.createElement("button");button.type="button";
      button.className=`practice-tile${example.mode==="memory"?` practice-back practice-color-${index}`:""}`;
      const img=new Image();img.src=tile.src;img.alt="";
      const back=document.createElement("span");back.textContent="?";back.className="practice-question";
      button.append(img,back);root.querySelector(".practice-board")!.append(button);
      button.addEventListener("click",()=>{
        if(previewing || index!==run.nextIndex)return;
        run.pick(index);if(run.complete)feedback.complete();else feedback.tap();update();
      });return button;
    });
    const update=():void=>{
      status.textContent=previewing ? "" : run.complete?"✓":`${run.progress}/${run.goal}`;
      root.querySelector(".practice-board")!.classList.toggle("is-previewing",previewing);
      status.setAttribute("aria-label",run.complete?"Practice complete":`${run.progress} of ${run.goal} complete. Tap the highlighted card.`);
      next.hidden=!run.complete;next.classList.toggle("is-guided",run.complete);
      buttons.forEach((button,i)=>{
        const guided=!previewing && i===run.nextIndex;
        const revealed=previewing||example.mode!=="memory"||run.matched.has(i)||run.open.includes(i);
        button.classList.toggle("is-revealed",revealed);button.classList.toggle("is-matched",run.matched.has(i));button.classList.toggle("is-guided",guided);
        button.disabled=!guided;
        button.setAttribute("aria-label",`Card ${i+1}, ${guided?"tap here":run.matched.has(i)?"matched":revealed?"face up":"face down"}`);
      });
    };
    root.querySelector("[data-skip]")!.addEventListener("click",finish);
    next.addEventListener("click",()=>{if(step<2)render(step+1);else finish();});
    root.scrollTop=0;update();
    if(previewing) {
      void Promise.all(buttons.map(button => button.querySelector("img")!.decode().catch(() => undefined))).then(() => {
        if(currentGeneration !== generation) return;
        previewTimer=setTimeout(() => { if(currentGeneration !== generation) return; previewing=false;update(); },2000);
      });
    }
  };
  render(0);
  return ()=>{cancelPreview();panel.classList.remove("visual-practice-panel");};
}
