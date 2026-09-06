import { PRACTICE_EXAMPLES } from "../content/pickTutorial";
import { PracticeRun } from "../core/pick/tutorial";
import { feedback } from "./feedback";

/** Guided practice has no timers or shared game state. */
export function mountPickTutorial(root: HTMLElement): () => void {
  const panel = root.closest(".help-panel")!;
  panel.classList.add("visual-practice-panel");
  const finish = (): void => { root.dispatchEvent(new CustomEvent("practice-done")); };
  const render = (step: number): void => {
    const example = PRACTICE_EXAMPLES[step]!;
    const run = new PracticeRun(example.mode, example.tiles);
    root.innerHTML = `<div class="visual-practice"><header class="visual-practice-head"><nav class="visual-practice-dots" aria-label="Practice steps"></nav><button type="button" class="text-btn" data-skip>Skip</button></header><h3>${example.title}</h3><p class="practice-sr-only">${example.instruction} Follow the highlighted button.</p><div class="visual-practice-preview"></div><div class="visual-practice-arrow" aria-hidden="true">↓</div><div class="practice-board" aria-label="Guided practice board"></div><footer class="visual-practice-foot"><p class="practice-status" role="status" aria-live="polite"></p><div class="visual-practice-actions"><button type="button" class="text-btn" data-retry aria-label="Try again">↻</button><button type="button" class="wood-btn" data-next>${step===2?"Done":"Next"}</button></div></footer></div>`;
    PRACTICE_EXAMPLES.forEach((entry,i)=>{
      const button=document.createElement("button");button.type="button";
      button.className=`visual-practice-dot${i===step?" is-current":i<step?" is-done":""}`;
      button.setAttribute("aria-label",`${i+1}. ${entry.title}`);button.setAttribute("aria-current",String(i===step));
      button.dataset.practiceMode=entry.mode;button.addEventListener("click",()=>render(i));root.querySelector(".visual-practice-dots")!.append(button);
    });
    const preview=root.querySelector(".visual-practice-preview")!;
    if(example.preview){const img=new Image();img.src=example.preview;img.alt=example.name!;preview.append(img);}
    else {
      const tile=example.tiles[0]!;
      for(let i=0;i<2;i++){if(i){const equal=document.createElement("span");equal.textContent="=";equal.setAttribute("aria-hidden","true");preview.append(equal);}const img=new Image();img.src=tile.src;img.alt="Matching face";preview.append(img);}
      preview.classList.add("is-pair-example");
    }
    const next=root.querySelector<HTMLButtonElement>("[data-next]")!;
    const status=root.querySelector<HTMLElement>(".practice-status")!;
    const buttons=run.tiles.map((tile,index)=>{
      const button=document.createElement("button");button.type="button";
      button.className=`practice-tile${example.mode==="memory"?` practice-back practice-color-${index}`:""}`;
      const img=new Image();img.src=tile.src;img.alt="";
      const back=document.createElement("span");back.textContent="?";back.className="practice-question";
      button.append(img,back);root.querySelector(".practice-board")!.append(button);
      button.addEventListener("click",()=>{
        if(index!==run.nextIndex)return;
        run.pick(index);if(run.complete)feedback.complete();else feedback.tap();update();
      });return button;
    });
    const update=():void=>{
      status.textContent=run.complete?"✓":`${run.progress}/${run.goal}`;
      status.setAttribute("aria-label",run.complete?"Practice complete":`${run.progress} of ${run.goal} complete. Tap the highlighted card.`);
      next.hidden=!run.complete;next.classList.toggle("is-guided",run.complete);
      buttons.forEach((button,i)=>{
        const guided=i===run.nextIndex;
        const revealed=example.mode!=="memory"||run.matched.has(i)||run.open.includes(i);
        button.classList.toggle("is-revealed",revealed);button.classList.toggle("is-matched",run.matched.has(i));button.classList.toggle("is-guided",guided);
        button.disabled=!guided;
        button.setAttribute("aria-label",`Card ${i+1}, ${guided?"tap here":run.matched.has(i)?"matched":revealed?"face up":"face down"}`);
      });
    };
    root.querySelector("[data-skip]")!.addEventListener("click",finish);
    root.querySelector("[data-retry]")!.addEventListener("click",()=>render(step));
    next.addEventListener("click",()=>{if(step<2)render(step+1);else finish();});
    root.scrollTop=0;update();
  };
  render(0);
  return ()=>{panel.classList.remove("visual-practice-panel");};
}
