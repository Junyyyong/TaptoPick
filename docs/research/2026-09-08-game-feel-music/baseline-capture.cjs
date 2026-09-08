/** Reproduce the pre-experiment UI from an isolated Git archive, never a checkout.
 * NODE_PATH=<directory containing playwright> node docs/research/2026-09-08-game-feel-music/baseline-capture.cjs
 * Requires Chrome and existing repository node_modules. Uses port 5190.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawn, execFileSync} = require('node:child_process');
const {pipeline} = require('node:stream/promises');
const {createHash} = require('node:crypto');
const {chromium} = require('playwright');
const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], {encoding:'utf8'}).trim();
const revision = 'c8c01aaaa7ab5cff8de8c5a6431167f370b3ecb1';
const seed = 20260908;
const base = 'http://127.0.0.1:5190';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const exit = proc => new Promise((resolve, reject) => {
  proc.on('error', reject);
  proc.on('exit', code => code === 0 ? resolve() : reject(new Error(`Process exited ${code}`)));
});

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'taptopick-baseline-'));
  const excluded = new Set(['docs', 'android', 'store', 'tests', '.github', 'scripts']);
  const entries = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-tree', '--name-only', revision], {cwd:repo, encoding:'utf8'}).trim().split('\n').filter(p => !excluded.has(p));
  const archive = spawn('git', ['archive', revision, '--', ...entries], {cwd:repo, stdio:['ignore', 'pipe', 'inherit']});
  const tar = spawn('tar', ['-xf', '-', '-C', scratch], {stdio:['pipe', 'ignore', 'inherit']});
  await Promise.all([pipeline(archive.stdout, tar.stdin), exit(archive), exit(tar)]);
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(scratch, 'node_modules'), 'dir');
  let server;
  let browser;
  const report = {
    capturedAt:new Date().toISOString(), revision, seed,
    viewport:{width:390, height:844}, deviceScaleFactor:2,
    pixelSize:{width:780, height:1688},
    method:'Actual stable Git snapshot exported into a fresh temporary directory, not a working-tree checkout. Chromium mobile emulation with seeded Math.random and a controlled browser clock; not original device photographs or user-study measurements. All choices use the real UI; image source/ARIA labels identify test inputs. The normal video timeout is fast-forwarded before tapping to show results.',
    captures:[],
  };
  try {
    server = spawn(process.execPath, [path.join(repo, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5190', '--strictPort'], {cwd:scratch, stdio:['ignore', 'pipe', 'pipe']});
    let log = '';
    server.stdout.on('data', data => log += data);
    server.stderr.on('data', data => log += data);
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(`Baseline server failed: ${log}`);
      try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
      await sleep(100);
    }
    assert(ready, `Baseline server not ready: ${log}`);
    browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
    report.browserVersion = browser.version();
    for (const mode of ['unit', 'montage', 'memory']) {
      const context = await browser.newContext({viewport:report.viewport, deviceScaleFactor:2, isMobile:true, hasTouch:true, locale:'en-US'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(initial => {
        let state = initial;
        Math.random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
      }, seed);
      await page.clock.install({time:new Date('2026-09-08T12:00:00Z')});
      await page.clock.pauseAt(new Date('2026-09-08T12:00:01Z'));
      await page.goto(base, {waitUntil:'networkidle'});
      await page.clock.fastForward(12000);
      await page.locator(`#mode-${mode}`).click();
      const loaded = () => page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].filter(image => image.getBoundingClientRect().width > 0).map(image => image.decode()));
      });
      await loaded();
      let scenario;
      if (mode === 'unit') {
        const name = await page.locator('.unit-reveal').getAttribute('aria-label');
        const ids = {Tapee:'tapee', Tepee:'tepee', Hooopee:'hoo', Zapee:'ja', Hapee:'ha', Bbogles:'bb', PinoPan:'pino'};
        const matchedName = Object.keys(ids).find(key => name.startsWith(key + ' '));
        assert(matchedName, `Unknown target ${name}`);
        const wrong = page.locator(`.picture-tile:not([aria-label="${ids[matchedName]} picture piece"])`).first();
        for (let i = 0; i < 5; i++) { await wrong.click(); await page.clock.runFor(250); }
        scenario = 'Picture Pieces: zero pieces found, five wrong picks, Game Over.';
      } else if (mode === 'montage') {
        for (let i = 0; i < 3; i++) {
          const target = await page.locator('#target-preview img').getAttribute('src');
          const sources = await page.locator('.picture-tile img').evaluateAll(images => images.map(image => image.getAttribute('src')));
          assert(sources.includes(target));
          await page.locator('.picture-tile').nth(sources.indexOf(target)).click();
          await page.clock.runFor(250);
          await loaded();
        }
        const wrong = page.locator('.picture-tile').filter({has:page.locator('img[src*="variation-"]')}).first();
        for (let i = 0; i < 5; i++) { await wrong.click(); await page.clock.runFor(250); }
        scenario = 'Montage Hunt: three exact matches, then five wrong picks, Game Over at 3×3.';
      } else {
        await page.clock.runFor(3100);
        await page.clock.fastForward(61000);
        scenario = 'Pair Memory: first-stage preview completed, no pairs selected, timer expired.';
      }
      await page.clock.fastForward(4100);
      await page.clock.fastForward(15100);
      if (await page.locator('#cheer').isVisible()) await page.locator('#cheer').click();
      await page.locator('#result-layer').waitFor({state:'visible'});
      // Let normal CSS animations settle, including the last depleted heart.
      await page.clock.resume();
      await page.waitForTimeout(1000);
      await loaded();
      assert.deepEqual(errors, []);
      const file = `before-${mode}-result.png`;
      await page.screenshot({path:path.join(__dirname, file), fullPage:false});
      const ui = await page.evaluate(() => ({
        title:document.querySelector('#result-title').textContent,
        detail:document.querySelector('#result-detail').textContent,
        targetName:document.querySelector('#target-character-name').textContent,
        boardCount:document.querySelectorAll('.picture-tile').length,
        resultBox:(() => { const r=document.querySelector('.result-panel').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}; })(),
      }));
      report.captures.push({file, mode, scenario, ui, errors, sha256:createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex')});
      fs.writeFileSync(path.join(__dirname, 'baseline.json'), JSON.stringify(report, null, 2) + '\n');
      console.log(JSON.stringify({file, ...ui}));
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    if (server && server.exitCode === null) { const stopped = new Promise(resolve => server.once('exit', resolve));server.kill();await stopped; }
    // Leave the isolated export in the OS temporary directory; no user files are deleted.
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
