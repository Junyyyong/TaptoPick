import { PRACTICE_EXAMPLES } from "../content/pickTutorial";
import { PracticeRun, type PracticeMode } from "../core/pick/tutorial";
import { feedback } from "./feedback";

/** Owns only practice DOM and timers, never the active game's state. */
export function mountPickTutorial(root: HTMLElement, play: (mode: PracticeMode) => void): () => void {
  let timer: number | undefined;
  let disposed = false;
  const cancel = (): void => { if (timer !== undefined) window.clearTimeout(timer); timer = undefined; };
  const render = (step: number): void => {
    cancel();
    const example = PRACTICE_EXAMPLES[step]!;
    const run = new PracticeRun(example.mode, example.tiles);
    root.innerHTML = `<div class="pick-practice"><nav class="practice-tabs" aria-label="Choose a practice game"></nav><p class="help-kicker">TRY IT · ${step+1}/3 · NO PENALTIES</p><h3>${example.title}</h3><p class="practice-instruction">${example.instruction}</p><div class="practice-preview"></div><p class="practice-status" role="status" aria-live="polite"></p><div class="practice-board" aria-label="Practice board"></div><p class="practice-rule">${example.rule}</p><div class="practice-actions"><button type="button" class="text-btn" data-retry>Try again</button><button type="button" class="wood-btn" data-next>${step===2?"Done":"Next game"}</button><button type="button" class="text-btn" data-play>Play game</button></div></div>`;
    const tabs = root.querySelector(".practice-tabs")!;
    PRACTICE_EXAMPLES.forEach((entry,i)=>{
      const button=document.createElement("button");button.type="button";button.textContent=entry.title;
      button.setAttribute("aria-pressed",String(i===step));button.dataset.practiceMode=entry.mode;
      button.addEventListener("click",()=>render(i));tabs.append(button);
    });
    const preview=root.querySelector(".practice-preview")!;
    if(example.preview){const label=document.createElement("p");label.textContent=example.name!;const img=new Image();img.src=example.preview;img.alt=example.name!;preview.append(label,img);}
    else preview.classList.add("hidden");
    const status=root.querySelector<HTMLElement>(".practice-status")!;
    const next=root.querySelector<HTMLButtonElement>("[data-next]")!;next.disabled=true;
    const board=root.querySelector(".practice-board")!;
    const buttons=run.tiles.map((tile,index)=>{
      const button=document.createElement("button");button.type="button";
      button.className=`practice-tile${example.mode==="memory"?` practice-back practice-color-${index}`:""}`;
      const img=new Image();img.src=tile.src;img.alt="";const back=document.createElement("span");back.textContent="?";back.className="practice-question";
      button.append(img,back);board.append(button);
      button.addEventListener("click",()=>{
        const result=run.pick(index);if(result==="ignored")return;
        if(result==="wrong"||result==="mismatch")feedback.reject();else if(run.complete)feedback.complete();else feedback.tap();
        update(result==="wrong"?(example.mode==="montage"?"Not an exact match. Try again!":"Not this piece. Try another!"):result==="mismatch"?"Different faces. Try again!":result==="first"?"Now flip another card.":undefined);
        if(result==="mismatch")timer=window.setTimeout(()=>{timer=undefined;if(disposed)return;run.hideMismatch();update();},650);
      });return button;
    });
    const update=(message?: string):void=>{
      status.textContent=run.complete?"Great job! Practice complete.":message??`${run.progress}/${run.goal} ${example.mode==="memory"?"pairs":"found"}`;
      next.disabled=!run.complete;
      buttons.forEach((button,i)=>{
        const revealed=example.mode!=="memory"||run.matched.has(i)||run.open.includes(i);
        button.classList.toggle("is-revealed",revealed);button.classList.toggle("is-matched",run.matched.has(i));button.disabled=run.matched.has(i)||run.complete;
        button.setAttribute("aria-label",example.mode==="memory"?`Card ${i+1}, ${run.matched.has(i)?"matched":revealed?"face up":"face down"}`:`Picture ${i+1}${run.matched.has(i)?", found":""}`);
      });
    };
    root.querySelector("[data-retry]")!.addEventListener("click",()=>render(step));
    next.addEventListener("click",()=>{if(step<2)render(step+1);else root.dispatchEvent(new CustomEvent("practice-done"));});
    root.querySelector("[data-play]")!.addEventListener("click",()=>play(example.mode));
    root.scrollTop=0;update();
  };
  render(0);
  return ()=>{disposed=true;cancel();};
}
