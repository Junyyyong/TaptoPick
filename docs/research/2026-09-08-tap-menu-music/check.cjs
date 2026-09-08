const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const url = process.env.PICK_TEST_URL || 'http://127.0.0.1:5189';
const menuMetadata = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../public/assets/audio/pick-tap-lobby.json'), 'utf8'));
const reports = [];

async function testPolicy(policy) {
  const browser = await chromium.launch({headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [`--autoplay-policy=${policy === 'allowed' ? 'no-user-gesture-required' : 'document-user-activation-required'}`,
      '--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplay']});
  try {
    for (const viewport of [{width: 390, height: 844}, {width: 375, height: 667}, {width: 320, height: 568}]) {
      const page = await browser.newPage({viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
      const cdp = await page.context().newCDPSession(page);
      const nativeRead = async expression => (await cdp.send('Runtime.evaluate', {expression, returnByValue: true, userGesture: false})).result.value;
      const errors = [], requests = [], checks = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (/pick-(garden|lobby|tap-lobby).*\.mp3/.test(request.url())) requests.push(request.url()); });
      await page.addInitScript(menuSeconds => {
        window.__loops = []; window.__maxLoops = 0; window.__contexts = [];
        const Native = window.AudioContext;
        window.AudioContext = class extends Native {
          constructor(...args) { super(...args); window.__contexts.push(this); }
          createBufferSource() {
            const source = super.createBufferSource(), start = source.start.bind(source), stop = source.stop.bind(source);
            const record = {live: false};
            source.start = (...args) => {
              if (source.loop) {
                record.live = true; record.duration = source.buffer.duration;
                record.track = Math.abs(record.duration - menuSeconds) < .01 ? 'menu' : Math.abs(record.duration - 38.4) < .01 ? 'game' : 'unknown';
                window.__loops.push(record);
                window.__maxLoops = Math.max(window.__maxLoops, window.__loops.filter(r => r.live).length);
              }
              return start(...args);
            };
            source.stop = (...args) => { record.live = false; return stop(...args); };
            return source;
          }
        };
      }, menuMetadata.seconds);
      await page.goto(url, {waitUntil: 'networkidle'});
      assert.equal(requests.length, 0, 'intro does not load music');
      // Do not evaluate via Playwright or advance virtual time before this proof:
      // automation evaluation can itself grant transient browser activation.
      await page.waitForTimeout(7000);
      const initial = await nativeRead(`JSON.stringify({
        activated: navigator.userActivation.hasBeenActive,
        loops: window.__loops.filter(r => r.live),
        contexts: window.__contexts.map(c => c.state),
        titleVisible: !document.querySelector('#screen-title').classList.contains('hidden'),
        hintVisible: !document.querySelector('#btn-title-music').classList.contains('hidden'),
        hint: document.querySelector('#btn-title-music').getBoundingClientRect().toJSON(),
        logo: document.querySelector('#brand-mark').getBoundingClientRect().toJSON(),
        lastMode: document.querySelector('#mode-memory').getBoundingClientRect().toJSON()
      })`);
      const first = JSON.parse(initial);
      assert.equal(first.activated, false, 'genuinely no browser user activation at first-visit check');
      const track = async (expected, label) => {
        await page.waitForFunction(value => {
          const live = window.__loops.filter(r => r.live);
          return value === 'silent' ? live.length === 0 : live.length === 1 && live[0].track === value;
        }, expected, {polling: 20, timeout: 10000}).catch(async error => {
          console.error({policy, viewport, label, errors, requests, loops: await page.evaluate(() => window.__loops)}); throw error;
        });
        checks.push({label, expected});
      };
      const shot = async name => {
        if (viewport.width !== 390) return;
        const {data} = await cdp.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false,
          clip: {x: 0, y: 0, width: viewport.width, height: viewport.height, scale: 2}});
        fs.writeFileSync(path.join(__dirname, `${name}.png`), Buffer.from(data, 'base64'));
      };
      assert(first.titleVisible);
      if (policy === 'allowed') {
        assert.deepEqual(first.loops.map(r => r.track), ['menu']);
        checks.push({label: 'first visit starts with hasBeenActive=false', expected: 'menu'});
        assert(!first.hintVisible);
        await shot('after-autoplay-menu');
      } else {
        assert.deepEqual(first.loops, []);
        checks.push({label: 'strict policy blocks with hasBeenActive=false', expected: 'silent'});
        assert(first.hintVisible);
        const {hint, lastMode} = first;
        assert(hint.y >= lastMode.y + lastMode.height, 'hint never covers game choices');
        assert(hint.y + hint.height <= viewport.height, 'hint fits the viewport');
        await shot('after-tap-prompt');
        if (viewport.width === 390) await page.touchscreen.tap(first.logo.x + first.logo.width / 2, first.logo.y + first.logo.height / 2);
        else if (viewport.width === 375) await page.touchscreen.tap(hint.x + hint.width / 2, hint.y + hint.height / 2);
        else { await cdp.send('Runtime.evaluate', {expression: `document.querySelector('#btn-title-music').focus()`, userGesture: false}); await page.keyboard.press('Enter'); }
        for (let i = 0; i < 100 && !(await nativeRead(`window.__loops.some(r => r.live && r.track === 'menu')`)); i++) await page.waitForTimeout(20);
        assert(await nativeRead(`window.__loops.some(r => r.live && r.track === 'menu')`), 'actual input starts playback without evaluate granting activation');
        await track('menu', 'one logo tap / prompt tap / Enter starts music without entering a game');
        assert(await page.locator('#screen-title').isVisible());
        assert(!(await page.locator('#btn-title-music').isVisible()));
      }
      // Virtual time is safe after the native first-visit activation assertions.
      await page.clock.install();
      for (const mode of ['unit', 'montage', 'memory']) {
        await page.locator(`#mode-${mode}`).tap(); await track('game', `${mode}: unchanged original theme`);
        await page.locator('#btn-pause').tap(); await track('silent', `${mode}: pause`);
        await page.locator('#btn-resume').tap(); await track('game', `${mode}: resume`);
        await page.locator('#btn-back').tap(); await track('menu', `${mode}: return to distinct menu theme`);
      }
      await page.locator('#btn-title-settings').tap();
      await track('menu', 'settings keeps menu');
      await shot('after-settings');
      await page.locator('[data-setting="music"]').tap(); await track('silent', 'mute works');
      await page.locator('#btn-help-close').tap();
      assert(!(await page.locator('#btn-title-music').isVisible()));
      await page.locator('#mode-unit').tap(); await track('silent', 'muted game stays silent');
      await page.locator('#btn-back').tap(); await track('silent', 'muted menu stays silent');
      assert.equal(requests.filter(r => r.includes('pick-tap-lobby')).length, 1);
      assert.equal(requests.filter(r => r.includes('pick-garden.')).length, 1);
      const max = await page.evaluate(() => window.__maxLoops); assert.equal(max, 1);
      await page.reload({waitUntil: 'networkidle'}); await page.clock.fastForward(7000); await page.clock.runFor(600);
      await track('silent', 'saved mute does not get overridden by autoplay on reload');
      assert(!(await page.locator('#btn-title-music').isVisible()));
      assert.equal(requests.length, 2, 'muted reload fetches no BGM');
      assert.deepEqual(errors, []);
      reports.push({policy, viewport, deviceScaleFactor: 2, firstVisit: first, passed: true, maxSimultaneousBgm: max, checks, errors});
      await page.close();
    }
  } finally { await browser.close(); }
}

(async () => {
  await testPolicy('allowed');
  await testPolicy('blocked');
  fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(reports, null, 2) + '\n');
  const audio = execFileSync(process.execPath, ['scripts/verify-pick-music.mjs'], {cwd: path.resolve(__dirname, '../../..')});
  fs.writeFileSync(path.join(__dirname, 'audio-verification.json'), audio);
  console.log('New tap-dance menu track and unchanged game music passed on all three mobile viewports under both autoplay policies.');
})().catch(error => { console.error(error); process.exitCode = 1; });
