// Build first, then run: npm run test:a11y
const { chromium } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');

const { createApp } = require('../dist/create-app');
const { pages: routeData } = require('../dist/page-data');

async function contrastReport(page) {
  return page.evaluate(() => {
    const rgb = color => (color.match(/[\d.]+/g) || []).map(Number);
    const lum = c => c.slice(0,3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v+.055)/1.055)**2.4; }).reduce((n,v,i) => n+v*[.2126,.7152,.0722][i],0);
    const blend = (a,b) => a.slice(0,3).map((v,i) => v*(a[3]??1)+b[i]*(1-(a[3]??1)));
    const failures=[];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('svg,script,style,[aria-hidden="true"]') || ![...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) continue;
      const s=getComputedStyle(el), r=el.getBoundingClientRect();
      if (!r.width || !r.height || s.visibility==='hidden' || s.display==='none') continue;
      let parent=el, layers=[];
      while(parent) { layers.push(rgb(getComputedStyle(parent).backgroundColor)); parent=parent.parentElement; }
      let bg=[255,255,255]; for(const layer of layers.reverse()) bg=blend(layer,bg);
      const fg=blend(rgb(s.color),bg), a=lum(fg), b=lum(bg), ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const threshold=parseFloat(s.fontSize)>=24 || (parseFloat(s.fontSize)>=18.66 && parseInt(s.fontWeight)>=700) ? 3 : 4.5;
      if(ratio<threshold) failures.push({tag:el.tagName,class:el.className,text:el.textContent.trim().slice(0,45),ratio:+ratio.toFixed(2),threshold,color:s.color,background:bg});
    }
    return failures;
  });
}

(async () => {
  const app = await createApp();
  await app.listen(0,'127.0.0.1');
  let browser;
  try {
    browser=await chromium.launch({channel:'msedge',headless:true});
    const context=await browser.newContext();
    const page=await context.newPage();
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    const base=await app.getUrl();
    const pages=Object.keys(routeData).map(key=>key==='home'?'':key);
    const failures=[];
    for(const width of [1280,390,320]) {
      await page.setViewportSize({width,height:900});
      for(const name of pages) {
        await page.goto(`${base}/${name}`);
        assert.equal(await page.locator('main').count(),1,`${name}: one main`);
        assert.equal(await page.locator('h1').count(),1,`${name}: one h1`);
        for(const theme of ['light','dark']) {
          const dark=await page.locator('body').evaluate(el=>el.classList.contains('dark-mode'));
          if(dark!==(theme==='dark')) await page.locator('.theme-toggle').click();
          const found=await contrastReport(page);
          if(found.length) failures.push({width,name,theme,contrast:found});
          const bounds=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,toolbar:document.querySelector('.display-controls').getBoundingClientRect().toJSON()}));
          assert(bounds.width<=width,`${name} horizontal overflow at ${width}`);
          assert(bounds.toolbar.right<=width && bounds.toolbar.bottom<=900,`${name}: toolbar in viewport`);
          for(const button of await page.locator('.display-controls button').all()) {
            const box=await button.boundingBox(); assert(box.width>=44 && box.height>=44,'44px control');
            assert((await button.getAttribute('aria-label')).includes(await button.innerText()),'Accessible name includes visible label');
          }
        }
      }
    }
    await page.setViewportSize({width:1280,height:900});
    await page.goto(base);
    const navHeight=await page.locator('nav').evaluate(el=>el.getBoundingClientRect().height);
    const toolbarY=await page.locator('.display-controls').evaluate(el=>el.getBoundingClientRect().top);
    for(const y of [20,49,51,80,50,0]) {
      await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);
      await page.waitForTimeout(80);
      assert.equal(await page.locator('nav').evaluate(el=>el.getBoundingClientRect().height),navHeight,'Stable nav at scroll threshold');
      assert.equal(await page.locator('.display-controls').evaluate(el=>el.getBoundingClientRect().top),toolbarY,'Viewport anchored toolbar');
      assert.equal(await page.locator('.hero-l').evaluate(el=>getComputedStyle(el).transform),'none','No hero scroll transform');
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>!document.body.classList.contains('motion-enabled'));
    await page.reload();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('motion-enabled')),false);
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('class'),'skip-link');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator(':focus').getAttribute('id'),'main-content');
    await page.getByRole('link',{name:'Services',exact:true}).click();
    assert(page.url().endsWith('#services'),'Native anchor URL');
    const isDark=await page.locator('body').evaluate(el=>el.classList.contains('dark-mode'));
    await page.reload();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('dark-mode')),isDark,'Theme persists');
    await page.goto(base);
    await page.screenshot({path:path.join(root,'tests','desktop-dark.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.reload();
    await page.screenshot({path:path.join(root,'tests','mobile-dark.png'),fullPage:false});
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log(JSON.stringify({pageThemeViewportChecks:pages.length*6,errors,failures:failures.map(f=>({...f,contrast:f.contrast.map(c=>({class:c.class,text:c.text,ratio:c.ratio}))}))},null,2));
    assert.equal(failures.length,0,'Text contrast checks failed (see report above)');
    // Progressive enhancement: all content and native links remain usable without JS.
    const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
    const plain=await noJS.newPage(); await plain.goto(base);
    assert(await plain.locator('h1').isVisible());
    assert(await plain.locator('#services').isVisible());
    assert.equal(await plain.locator('.display-controls').isVisible(),false);
    const denied=await browser.newContext();
    await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage disabled');}}));
    const deniedPage=await denied.newPage();
    const deniedErrors=[]; deniedPage.on('pageerror',error=>deniedErrors.push(error.message));
    await deniedPage.goto(base);
    await deniedPage.locator('.theme-toggle').click();
    assert.equal(deniedErrors.length,0,'Blocked storage is supported');
    console.log('PASS: scroll, keyboard, reduced motion, persistence, controls, no-JS and contrasts.');
  } finally { await browser?.close(); await app.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
