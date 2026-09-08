import { PRACTICE_EXAMPLES } from "../content/pickTutorial";
import { PracticeRun } from "../core/pick/tutorial";
import { feedback } from "./feedback";
import { MEMORY_QUESTION_ICON } from "./memoryQuestionIcon";

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
    let countdown = 3;
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
    if(example.pieceIndices) {
      preview.classList.add("practice-piece-preview");
      example.pieceIndices.forEach((pieceIndex,index)=>{
        const color=new Image();color.src=example.preview!;color.alt="";
        color.className="practice-piece-color";color.dataset.pieceSrc=example.tiles[index]!.src;
        const row=Math.floor(pieceIndex/3),column=pieceIndex%3;
        color.style.clipPath=`inset(${row/3*100}% ${(2-column)/3*100}% ${(2-row)/3*100}% ${column/3*100}%)`;
        preview.append(color);
      });
    }
    const next=root.querySelector<HTMLButtonElement>("[data-next]")!;
    root.querySelector(".visual-practice")!.classList.toggle("is-unit",example.mode === "unit");
    const countdownLabel=document.createElement("div");
    countdownLabel.className="practice-countdown";
    countdownLabel.setAttribute("role","status");
    if(previewing) root.querySelector(".practice-board")!.before(countdownLabel);
    const status=root.querySelector<HTMLElement>(".practice-status")!;
    const buttons=run.tiles.map((tile,index)=>{
      const button=document.createElement("button");button.type="button";
      button.className=`practice-tile${example.mode==="memory"?` practice-back practice-color-${index}`:""}`;
      button.dataset.target=String(tile.target);
      const img=new Image();img.src=tile.src;img.alt="";
      button.append(img);
      if(example.mode==="memory") {
        const back=document.createElement("span");back.innerHTML=MEMORY_QUESTION_ICON;back.className="practice-question";
        button.append(back);
      }
      root.querySelector(".practice-board")!.append(button);
      button.addEventListener("click",()=>{
        if(example.mode==="unit" && !tile.target && !run.complete){
          run.pick(index);button.classList.remove("is-wrong");void button.offsetWidth;button.classList.add("is-wrong");
          status.textContent="Not Tepee";return;
        }
        if(previewing || index!==run.nextIndex)return;
        run.pick(index);if(run.complete)feedback.complete();else feedback.tap();update();
      });return button;
    });
    const update=():void=>{
      status.textContent=previewing || run.complete ? "" : `${run.progress}/${run.goal}`;
      countdownLabel.textContent=previewing ? String(countdown) : "";
      root.querySelector(".practice-board")!.classList.toggle("is-previewing",previewing);
      status.setAttribute("aria-label",run.complete?"Practice complete":`${run.progress} of ${run.goal} complete. Tap the highlighted card.`);
      next.hidden=!run.complete;next.classList.toggle("is-guided",run.complete);
      preview?.querySelectorAll<HTMLImageElement>(".practice-piece-color").forEach(image=>{
        image.classList.toggle("is-revealed",[...run.matched].some(i=>run.tiles[i]!.src===image.dataset.pieceSrc));
      });
      buttons.forEach((button,i)=>{
        const guided=!previewing && i===run.nextIndex;
        const revealed=previewing||example.mode!=="memory"||run.matched.has(i)||run.open.includes(i);
        button.classList.toggle("is-revealed",revealed);button.classList.toggle("is-matched",run.matched.has(i));button.classList.toggle("is-guided",guided);
        button.disabled=example.mode==="unit" ? run.complete || run.matched.has(i) : !guided;
        button.setAttribute("aria-label",`Card ${i+1}, ${guided?"tap here":run.matched.has(i)?"matched":revealed?"face up":"face down"}`);
      });
    };
    root.querySelector("[data-skip]")!.addEventListener("click",finish);
    next.addEventListener("click",()=>{if(step<2)render(step+1);else finish();});
    root.scrollTop=0;update();
    if(previewing) {
      void Promise.all(buttons.map(button => button.querySelector("img")!.decode().catch(() => undefined))).then(() => {
        if(currentGeneration !== generation) return;
        const tick=():void=>{
          if(currentGeneration !== generation) return;
          countdown--;
          if(countdown===0) previewing=false;
          update();
          if(previewing) previewTimer=setTimeout(tick,1000);
        };
        previewTimer=setTimeout(tick,1000);
      });
    }
  };
  render(0);
  return ()=>{cancelPreview();panel.classList.remove("visual-practice-panel");};
}
