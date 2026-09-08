const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const url = process.env.PICK_TEST_URL || 'http://127.0.0.1:5189';

(async () => {
  const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const reports = [];
  try {
    for (const viewport of [{width: 390, height: 844}, {width: 375, height: 667}, {width: 320, height: 568}]) {
      const page = await browser.newPage({viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
      const errors = [], requests = [], checks = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (/pick-garden.*\.mp3/.test(r.url())) requests.push(r.url()); });
      await page.addInitScript(() => {
        let seed = 20260908;
        Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
        window.__loops = []; window.__maxLoops = 0;
        const Native = window.AudioContext;
        window.AudioContext = class extends Native {
          createBufferSource() {
            const source = super.createBufferSource(), start = source.start.bind(source), stop = source.stop.bind(source);
            const record = {live: false};
            source.start = (...args) => {
              if (source.loop) {
                record.live = true; record.duration = source.buffer.duration;
                record.track = record.duration > 40 ? 'menu' : 'game';
                window.__loops.push(record);
                window.__maxLoops = Math.max(window.__maxLoops, window.__loops.filter(r => r.live).length);
              }
              return start(...args);
            };
            source.stop = (...args) => { record.live = false; return stop(...args); };
            return source;
          }
        };
      });
      await page.clock.install({time: new Date('2026-09-08T03:00:00Z')});
      await page.clock.pauseAt(new Date('2026-09-08T03:00:01Z'));
      await page.goto(url, {waitUntil: 'networkidle'});
      await page.clock.fastForward(7000);
      const expectTrack = async (track, label) => {
        await page.waitForFunction(expected => {
          const live = window.__loops.filter(r => r.live);
          return expected === 'silent' ? live.length === 0 : live.length === 1 && live[0].track === expected;
        }, track, {polling: 20, timeout: 10000}).catch(async error => {
          console.error({label, errors, requests, loops: await page.evaluate(() => window.__loops)});
          throw error;
        });
        checks.push({label, track});
      };
      const shot = async name => {
        if (viewport.width !== 390) return;
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].filter(i => i.getBoundingClientRect().width).map(i => i.decode()));
        });
        await page.screenshot({path: path.join(__dirname, `${name}.png`)});
      };
      const hide = async hidden => page.evaluate(value => {
        Object.defineProperty(document, 'hidden', {configurable: true, value});
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);

      assert(await page.locator('#screen-title').isVisible());
      assert.equal(requests.length, 0, 'no BGM download before the first gesture');
      await expectTrack('silent', 'initial menu waits for gesture');
      await page.keyboard.press('a');
      await expectTrack('menu', 'first key starts menu music');
      await shot('after-menu');
      await page.locator('#btn-title-settings').click();
      await expectTrack('menu', 'settings keeps menu music');
      await shot('after-settings');
      await page.locator('[data-setting="music"]').click();
      await expectTrack('silent', 'settings mute');
      await page.locator('[data-setting="music"]').click();
      await expectTrack('menu', 'settings unmute');
      await page.locator('#btn-help-close').click();
      await page.locator('#btn-title-tutorial').click();
      await expectTrack('menu', 'How to play keeps menu music');
      await page.locator('[data-skip]').click();
      await hide(true); await expectTrack('silent', 'hidden menu pauses');
      await hide(false); await expectTrack('menu', 'visible menu resumes');

      for (const mode of ['unit', 'montage', 'memory']) {
        await page.locator(`#mode-${mode}`).click();
        await expectTrack('game', `${mode}: original gameplay track`);
        if (mode === 'unit') await shot('after-game');
        await page.locator('#btn-pause').click();
        await expectTrack('silent', `${mode}: paused`);
        await page.locator('#btn-resume').click();
        await expectTrack('game', `${mode}: resumed`);
        await hide(true); await expectTrack('silent', `${mode}: hidden`);
        await hide(false); await expectTrack('silent', `${mode}: stays paused after returning`);
        await page.locator('#btn-pause-menu').click();
        await expectTrack('menu', `${mode}: main menu from pause`);
      }
      for (let i = 0; i < 4; i++) {
        await page.locator('#mode-unit').click();
        await page.locator('#btn-back').click();
      }
      await expectTrack('menu', 'rapid scene changes leave only menu');

      await page.locator('#mode-unit').click();
      await expectTrack('game', 'failure setup');
      const alt = await page.locator('#target-preview .unit-reveal').getAttribute('aria-label');
      const id = {Tapee: 'tapee', Tepee: 'tepee', Hooopee: 'hoo', Hapee: 'ha', Zapee: 'ja', Bbogles: 'bb', PinoPan: 'pino'}[alt.split(' ')[0]];
      const wrong = page.locator(`.picture-tile:not([aria-label="${id} picture piece"])`).first();
      for (let i = 0; i < 5; i++) await wrong.click({force: true});
      await expectTrack('silent', 'video does not overlap BGM');
      await page.clock.runFor(1200);
      await page.locator('#btn-cheer-continue').click();
      assert(await page.locator('#result-layer').isVisible());
      await expectTrack('silent', 'result stays silent');
      await page.locator('#btn-result-menu').click();
      await expectTrack('menu', 'result Home resumes menu');
      assert.equal(requests.length, 2, 'one download per track despite repeated starts');
      const maxBeforeReload = await page.evaluate(() => window.__maxLoops);
      assert.equal(maxBeforeReload, 1, 'never overlaps during the full scene sequence');

      await page.locator('#btn-title-settings').click();
      await page.locator('[data-setting="music"]').click();
      await page.locator('#btn-help-close').click();
      await page.locator('#mode-unit').click();
      await expectTrack('silent', 'saved menu mute applies to game');
      await page.reload({waitUntil: 'networkidle'}); await page.clock.fastForward(7000);
      await page.locator('#btn-title-settings').click();
      assert.equal(await page.locator('[data-setting="music"] [role="switch"]').getAttribute('aria-checked'), 'false');
      await expectTrack('silent', 'muted preference survives reload and gesture');
      assert.equal(requests.length, 2, 'muted reload downloads no music');
      await page.locator('[data-setting="music"]').click();
      await expectTrack('menu', 'unmute after reload starts menu');
      assert.deepEqual(errors, []);
      const maxLoops = await page.evaluate(() => window.__maxLoops);
      assert.equal(maxLoops, 1);
      reports.push({viewport, deviceScaleFactor: 2, passed: true, checks, maxSimultaneousBgm: maxLoops, errors,
        maxBeforeReload, visibilityTest: 'synthetic visibilitychange with document.hidden overridden; not a physical device test'});
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(reports, null, 2) + '\n');
    const audio = execFileSync(process.execPath, ['scripts/verify-pick-music.mjs'], {cwd: path.resolve(__dirname, '../../..')});
    fs.writeFileSync(path.join(__dirname, 'audio-verification.json'), audio);
    console.log('Menu/game audio checks passed on three mobile viewports.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
