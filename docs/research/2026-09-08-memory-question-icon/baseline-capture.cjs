/** Actual pre-icon Git snapshot, isolated from subsequent working-tree changes.
 * NODE_PATH=<directory containing playwright> node docs/research/2026-09-08-memory-question-icon/baseline-capture.cjs
 * Requires local Chrome and repository node_modules. Never checks out a branch.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const assert = require('node:assert/strict');
const {spawn, execFileSync} = require('node:child_process');
const {pipeline} = require('node:stream/promises');
const {createHash} = require('node:crypto');
const {chromium} = require('playwright');
const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], {encoding:'utf8'}).trim();
const revision = '4156989b42a152b80c4dd5c38727a34b463ab0e0';
const seed = 20260908;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const exited = proc => new Promise((resolve, reject) => {
  proc.on('error', reject);
  proc.on('exit', code => code === 0 ? resolve() : reject(new Error(`Process exited ${code}`)));
});
const freePort = async () => {
  for (let port = 5194; port < 5204; port++) {
    const available = await new Promise(resolve => {
      const probe = net.createServer();
      probe.once('error', () => resolve(false));
      probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
    });
    if (available) return port;
  }
  throw new Error('No unused baseline port available. No existing server was stopped.');
};

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'taptopick-question-baseline-'));
  const excluded = new Set(['docs', 'android', 'store', 'tests', '.github', 'scripts']);
  const entries = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-tree', '--name-only', revision], {cwd:repo, encoding:'utf8'}).trim().split('\n').filter(p => !excluded.has(p));
  const archive = spawn('git', ['archive', revision, '--', ...entries], {cwd:repo, stdio:['ignore', 'pipe', 'inherit']});
  const tar = spawn('tar', ['-xf', '-', '-C', scratch], {stdio:['pipe', 'ignore', 'inherit']});
  await Promise.all([pipeline(archive.stdout, tar.stdin), exited(archive), exited(tar)]);
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(scratch, 'node_modules'), 'dir');
  let server;
  let browser;
  const report = {
    capturedAt:new Date().toISOString(), revision, seed,
    viewport:{width:390, height:844}, deviceScaleFactor:2,
    pixelSize:{width:780, height:1688},
    method:'Actual pre-icon Git revision exported into an isolated temporary directory. Chromium mobile emulation, seeded Math.random and controlled browser clock; not a real-device photograph or user-study measurement. Music, sound and haptics disabled through stored preferences. Stage 1 selected through the real UI; its normal three-second preview elapses before capture.',
    captures:[],
  };
  try {
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [path.join(repo, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {cwd:scratch, stdio:['ignore', 'pipe', 'pipe']});
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
    const page = await browser.newPage({viewport:report.viewport, deviceScaleFactor:2, isMobile:true, hasTouch:true, locale:'en-US'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(initial => {
      let state = initial;
      Math.random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
      localStorage.setItem('taptopick.preferences.v1', JSON.stringify({soundOn:false, musicOn:false, hapticsOn:false}));
    }, seed);
    await page.clock.install({time:new Date('2026-09-08T12:00:00Z')});
    await page.goto(base, {waitUntil:'networkidle'});
    await page.clock.fastForward(7000);
    await page.locator('#mode-memory').click();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].filter(image => image.getBoundingClientRect().width > 0).map(image => image.decode()));
    });
    await page.clock.runFor(3100);
    await page.clock.pauseAt(await page.evaluate(() => Date.now()));
    const ui = await page.evaluate(() => ({
      boardCount:document.querySelectorAll('.memory-card').length,
      hiddenCards:document.querySelectorAll('.memory-card:not(.is-open):not(.is-matched)').length,
      backText:[...document.querySelectorAll('.memory-back')].map(node => node.textContent),
      svgCount:document.querySelectorAll('.memory-back svg').length,
      firstCard:(() => { const r=document.querySelector('.memory-card').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}; })(),
    }));
    assert.equal(ui.boardCount, 16);
    assert.equal(ui.hiddenCards, 16);
    assert.equal(ui.svgCount, 0);
    assert(ui.backText.every(text => text === '?'));
    assert.deepEqual(errors, []);
    const file = 'before-memory.png';
    await page.screenshot({path:path.join(__dirname, file), fullPage:false, animations:'disabled'});
    report.captures.push({file, mode:'memory', scenario:'Stage 1, 4×4, sixteen closed font-rendered question-mark cards after preview.', ui, errors, sha256:createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex')});
    fs.writeFileSync(path.join(__dirname, 'baseline.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {
    if (browser) await browser.close();
    if (server && server.exitCode === null) { const stopped = new Promise(resolve => server.once('exit', resolve));server.kill();await stopped; }
    // Leave the isolated export in OS temporary storage; never delete user files.
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
