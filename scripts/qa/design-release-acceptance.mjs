import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright-core'
import { resolveBrowserExecutable } from './browser-fixtures.mjs'
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4187'
const out=process.env.QA_OUTPUT_DIR||'tmp/design-release'
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({executablePath:resolveBrowserExecutable(),headless:true})
const results=[]
async function check(page,name){
 await page.evaluate(()=>document.fonts.ready)
 const width=await page.evaluate(()=>({viewport:innerWidth,actual:document.documentElement.scrollWidth}))
 assert(width.actual<=width.viewport+2,`${name}: horizontal overflow`)
 await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:65})
 results.push(name)
}
try{
 for(const width of [320,390,1440])for(const dark of [false,true]){
  const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},hasTouch:width<500,colorScheme:dark?'dark':'light',reducedMotion:'reduce',serviceWorkers:'block'})
  await context.addInitScript(({dark})=>{
   sessionStorage.setItem('splash-shown','1')
   if(!localStorage.getItem('qa-design')){
    localStorage.setItem('qa-design','1')
    localStorage.setItem('sikh-onboarding',JSON.stringify({state:{hasCompletedOnboarding:true,isOnboardingOpen:false},version:0}))
    localStorage.setItem('sikh-theme',JSON.stringify({state:{dark,mode:dark?'dark':'light'},version:0}))
   }
  },{dark})
  const page=await context.newPage();page.setDefaultTimeout(20000)
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  const key=`${width}-${dark?'dark':'light'}`
  for(const [name,route,selector] of [['home','/','[data-page="home"]'],['read','/banis','[data-page="banis"]'],['saved','/saved','[data-testid="page-library"]'],['more','/more','[data-testid="page-more"]'],['downloads','/downloads','[data-page="downloads"]']]){
   await page.goto(base+route);await page.locator(selector).waitFor();await check(page,`${name}-${key}`)
  }
  await page.goto(base+'/more');await page.getByTestId('more-open-prose').click()
  await page.getByTestId('more-prose-sheet').waitFor();await check(page,`prose-settings-${key}`)
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0)
  if(width===390){
   for(const palette of ['app','paper','sepia','night']){
    await page.evaluate(palette=>localStorage.setItem('sikh-epub-reader-preferences',JSON.stringify({state:{fontScale:1,lineHeight:'comfortable',measure:'standard',palette},version:1})),palette)
    await page.goto(base+'/library/panth-prakash-english/chapters/episode-001')
    const reader=page.getByTestId('panth-chapter-reader');await reader.waitFor()
    assert.equal(await reader.getAttribute('data-palette'),palette==='app'?(dark?'night':'paper'):palette)
    await page.getByRole('button',{name:'Reading appearance',exact:true}).click()
    await page.getByRole('dialog').waitFor();await check(page,`book-${key}-${palette}`)
    const colors=await page.locator('.epub-reader-panel').evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}))
    assert.notEqual(colors.background,colors.color)
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0)
   }
  }
  assert.deepEqual(errors,[]);await context.close();console.log('PASS design',key)
 }
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({passed:true,checks:results},null,2))
}finally{await browser.close()}
