const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const url = process.env.PICK_TEST_URL || 'http://127.0.0.1:5189';
const viewport = { width: 390, height: 844 };
const fixtureUrl = `${url}/__cheer-lifecycle.html`;
const fixture = `<!doctype html><html><head><style>.hidden { display: none; }</style></head><body>
  <div id="cheer" class="hidden" aria-hidden="true">
    <div id="cheer-card"><p id="cheer-headline"></p><p id="cheer-score-label"></p><p id="cheer-score"></p></div>
    <div id="cheer-word"></div><video id="cheer-clip" muted></video><audio id="cheer-sound"></audio>
    <button id="btn-cheer-continue">Continue</button>
  </div>
</body></html>`;

async function installClock(page) {
  await page.clock.install({ time: new Date('2026-09-08T05:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-08T05:00:01Z'));
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const report = {
    checkedAt: new Date().toISOString(), url, viewport, deviceScaleFactor: 2,
    method: 'Local Chromium. Isolated Cheer fixture imports the actual source module. Media src/play/pause/currentTime are mocked, and the browser clock is controlled; this checks lifecycle and accessibility state, not real playback, decoding, synchronization accuracy, or visual design. The final cancellation check uses the actual game UI with sound disabled.',
    checks: [], errors: [],
  };
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.route(fixtureUrl, route => route.fulfill({ contentType: 'text/html', body: fixture }));
    await page.addInitScript(() => {
      const states = new WeakMap();
      const state = media => {
        if (!states.has(media)) states.set(media, { paused: true, currentTime: 0, src: '', plays: 0, pauses: 0 });
        return states.get(media);
      };
      Object.defineProperties(HTMLMediaElement.prototype, {
        src: { configurable: true, get() { return state(this).src; }, set(value) { state(this).src = new URL(value, location.href).href; } },
        currentTime: { configurable: true, get() { return state(this).currentTime; }, set(value) { state(this).currentTime = value; } },
        paused: { configurable: true, get() { return state(this).paused; } },
        ended: { configurable: true, get() { return false; } },
      });
      HTMLMediaElement.prototype.play = function () { const value = state(this); value.paused = false; value.plays++; return Promise.resolve(); };
      HTMLMediaElement.prototype.pause = function () { const value = state(this); value.paused = true; value.pauses++; };
      window.__mediaState = id => ({ ...state(document.getElementById(id)) });
    });
    await installClock(page);
    await page.goto(fixtureUrl, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      const { Cheer } = await import('/src/ui/screens/cheer.ts');
      window.__cheer = new Cheer();
      window.__done = 0;
      window.__cheer.playOutcome('PUZZLE COMPLETE', 1500, () => window.__done++, 'tepee', true);
    });
    assert.equal(await page.locator('#cheer').getAttribute('aria-hidden'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-cheer-continue');
    assert.equal(await page.locator('#cheer-card').isVisible(), false);
    assert.equal(await page.evaluate(() => window.__mediaState('cheer-clip').paused), false);
    assert.equal(await page.evaluate(() => window.__mediaState('cheer-sound').paused), false);
    report.checks.push({ name: 'Outcome immediately shows clip, exposes aria state, and focuses Continue', passed: true });

    await page.clock.runFor(5000);
    await page.evaluate(() => {
      document.getElementById('cheer-clip').currentTime = 5;
      document.getElementById('cheer-sound').currentTime = 4.8;
      window.__cheer.setHidden(true);
    });
    assert.equal(await page.evaluate(() => window.__mediaState('cheer-clip').paused), true);
    assert.equal(await page.evaluate(() => window.__mediaState('cheer-sound').paused), true);
    await page.clock.runFor(30_000);
    assert.equal(await page.locator('#cheer').evaluate(element => element.classList.contains('cheer-hold')), false);
    assert.equal(await page.evaluate(() => window.__done), 0);
    report.checks.push({ name: 'Hiding pauses both media and freezes the 15-second fallback timer', hiddenMs: 30_000, passed: true });

    await page.evaluate(() => window.__cheer.setHidden(false));
    const resumed = await page.evaluate(() => ({ clip: window.__mediaState('cheer-clip'), sound: window.__mediaState('cheer-sound') }));
    assert.equal(resumed.clip.paused, false);
    assert.equal(resumed.sound.paused, false);
    assert.equal(resumed.sound.currentTime, resumed.clip.currentTime);
    assert.equal(resumed.clip.plays, 2);
    assert.equal(resumed.sound.plays, 2);
    await page.clock.runFor(9999);
    assert.equal(await page.locator('#cheer').evaluate(element => element.classList.contains('cheer-hold')), false);
    await page.clock.runFor(1);
    assert.equal(await page.locator('#cheer').evaluate(element => element.classList.contains('cheer-hold')), true);
    assert.equal(await page.evaluate(() => window.__done), 0);
    report.checks.push({ name: 'Resume restarts both tracks at the clip position and retains only the remaining 10 seconds', remainingMs: 10_000, passed: true });

    await page.locator('#btn-cheer-continue').click();
    assert.equal(await page.evaluate(() => window.__done), 1);
    assert.equal(await page.locator('#cheer').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('#cheer').isVisible(), false);
    assert.equal(await page.evaluate(() => window.__mediaState('cheer-clip').paused), true);
    assert.equal(await page.evaluate(() => window.__mediaState('cheer-sound').paused), true);
    await page.clock.runFor(60_000);
    assert.equal(await page.evaluate(() => window.__done), 1);
    report.checks.push({ name: 'Continue hides the overlay, pauses media, and invokes completion exactly once', passed: true });

    await page.evaluate(() => window.__cheer.playOutcome('GAME OVER', 0, () => window.__done++, 'tepee', false));
    assert.equal(await page.locator('#cheer-word').textContent(), 'TRY AGAIN');
    await page.clock.runFor(1000);
    await page.evaluate(() => { window.__cheer.setHidden(true); window.__cheer.stop(); });
    await page.clock.runFor(30_000);
    await page.evaluate(() => window.__cheer.setHidden(false));
    await page.clock.runFor(30_000);
    assert.equal(await page.evaluate(() => window.__done), 1);
    assert.equal(await page.locator('#cheer').isVisible(), false);
    assert.equal(await page.locator('#cheer').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.evaluate(() => window.__mediaState('cheer-clip').paused), true);
    report.checks.push({ name: 'Stop while hidden cancels callbacks and prevents resume or stale overlays', passed: true });
    await page.close();

    const gamePage = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    gamePage.on('pageerror', error => report.errors.push(error.message));
    await gamePage.addInitScript(() => {
      localStorage.setItem('taptopick.preferences.v1', JSON.stringify({ soundOn: false, musicOn: false, hapticsOn: false, tutorialDone: true }));
      let seed = 20260908;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    });
    await installClock(gamePage);
    await gamePage.goto(url, { waitUntil: 'networkidle' });
    await gamePage.clock.fastForward(7000);
    await gamePage.locator('#mode-unit').click();
    const label = await gamePage.locator('#target-preview .unit-reveal').getAttribute('aria-label');
    const names = { Tapee: 'tapee', Tepee: 'tepee', Hooopee: 'hoo', Hapee: 'ha', Zapee: 'ja', Bbogles: 'bb', PinoPan: 'pino' };
    const characterId = names[label.split(' ')[0]];
    assert(characterId, `Unknown unit preview: ${label}`);
    const pieces = gamePage.locator(`.picture-tile[aria-label="${characterId} picture piece"]`);
    const count = await pieces.count();
    assert(count === 9 || count === 12);
    for (let index = 0; index < count; index++) await pieces.nth(index).click({ force: true });
    assert.equal(await gamePage.locator('#screen-game').evaluate(element => element.classList.contains('is-complete-moment')), true);
    await gamePage.locator('#btn-back').click();
    await gamePage.clock.runFor(2500);
    assert.equal(await gamePage.locator('#screen-title').isVisible(), true);
    assert.equal(await gamePage.locator('#cheer').isVisible(), false);
    assert.equal(await gamePage.locator('#result-layer').isVisible(), false);
    assert.equal(await gamePage.locator('#pick-moment').evaluate(element => element.classList.contains('is-visible')), false);
    report.checks.push({ name: 'Actual game: leaving the 1.1-second completion hold cancels its pending video/result', characterId, pieces: count, waitAfterExitMs: 2500, passed: true });
    await gamePage.close();

    assert.deepEqual(report.errors, []);
    report.passed = true;
    fs.writeFileSync(path.join(__dirname, 'lifecycle.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
