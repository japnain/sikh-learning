// Browser-side acceptance helpers. Run in the live local app after setting 390×844 mobile/touch, Study and Light.
// The manifest supplies reviewed counts and exact first/middle/last section targets.
// This inspects and operates the real rendered UI; it does not inject scripture or application state.
export async function auditBaniReaderCase(expected){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const settle=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>requestAnimationFrame(resolve));};
 const result={id:expected.id,length:expected.requestedlength,name:expected.baniName,url:location.pathname+location.search,expectedRows:expected.rows,expectedSections:expected.sections,checks:[],failures:[]};
 const deadline=performance.now()+35000;
 let rows=[];
 while(performance.now()<deadline){
  rows=[...document.querySelectorAll('[data-reader-anchor]')];
  const entry=document.querySelector('[data-study-entry-id]')?.getAttribute('data-study-entry-id')||'';
  if(rows.length===expected.rows&&entry.startsWith(`bani-${expected.id}-`))break;
  await pause(100);
 }
 result.rows=rows.length;
 result.width=document.documentElement.clientWidth;
 result.scrollWidth=document.documentElement.scrollWidth;
 result.primaryScroller=document.scrollingElement?.tagName;
 result.presentation=document.querySelector('[data-testid="page-study"]')?.getAttribute('data-reader-presentation');
 if(rows.length!==expected.rows){result.failures.push('row-count');result.body=document.body.innerText.slice(0,500);result.passed=false;return result;}
 if(result.scrollWidth>result.width+1)result.failures.push('document-overflow');
 if(result.primaryScroller!=='HTML')result.failures.push('primary-scroller');
 if(result.width!==390||innerHeight!==844)result.failures.push('viewport');
 if(result.presentation!=='study')result.failures.push('presentation');
 await document.fonts.ready;await settle();
 const contents=()=>document.querySelector('[data-reader-header] button[aria-label="Contents"]');
 const close=()=>document.querySelector('[data-testid="study-reader-sections-sheet"] button[aria-label="Close"]');
 const samples=[...new Map(Object.values(expected.samples).map(sample=>[sample.sectionIndex,sample])).values()];
 for(const sample of samples){
  const origin=scrollY;
  contents()?.click();await settle();
  const buttons=[...document.querySelectorAll('[data-testid="bani-composition-sections"] button')];
  result.sections=buttons.length;
  if(buttons.length!==expected.sections){result.failures.push('section-count');close()?.click();await settle();break;}
  const scroller=document.querySelector('.study-reader-sections-sheet__scroll');
  result.contentsGeometry??=[];
  if(scroller)result.contentsGeometry.push({index:sample.sectionIndex,width:scroller.clientWidth,scrollWidth:scroller.scrollWidth});
  if(scroller&&scroller.scrollWidth>scroller.clientWidth+1)result.failures.push('contents-overflow');
  const button=buttons[sample.sectionIndex];
  const label=button?.querySelector('.study-reader-section-label > span')?.textContent?.trim();
  if(label!==sample.label){result.failures.push('section-label');close()?.click();await settle();break;}
  button.click();await settle();
  const target=document.querySelector(`[data-reader-anchor][data-verse-id="${sample.startVerseId}"]`);
  const rect=target?.getBoundingClientRect();
  const headerBottom=document.querySelector('[data-reader-header]')?.getBoundingClientRect().bottom;
  const check={scrollTop:scrollY,maxScroll:document.documentElement.scrollHeight-innerHeight,index:sample.sectionIndex,label,verseId:sample.startVerseId,targetTop:rect?.top,targetBottom:rect?.bottom,headerBottom,visible:!!rect&&rect.top>=headerBottom-1&&rect.top<innerHeight,returnAvailable:!!document.querySelector('[aria-label="Return to previous place"]')};
  if(!check.visible)result.failures.push('target-clearance');
  if(!check.returnAvailable)result.failures.push('missing-return');
  contents()?.click();await settle();
  const currents=[...document.querySelectorAll('[data-testid="study-reader-sections-sheet"] [aria-current="location"]')];
  check.currentCount=currents.length;
  check.currentLabel=currents[0]?.querySelector('.study-reader-section-label > span')?.textContent?.trim();
  if(currents.length!==1||check.currentLabel!==sample.label)result.failures.push('current-location');
  close()?.click();await settle();
  document.querySelector('[aria-label="Return to previous place"]')?.click();await settle();
  check.returnDelta=scrollY-origin;
  check.returnCleared=!document.querySelector('[aria-label="Return to previous place"]');
  if(Math.abs(check.returnDelta)>3||!check.returnCleared)result.failures.push('return-location');
  result.checks.push(check);
 }
 result.readerState=document.querySelector('[data-testid="page-study"]')?.getAttribute('data-ai-state');
 if(result.readerState!=='ready')result.failures.push('reading-not-ready');
 result.failures=[...new Set(result.failures)];
 result.passed=result.failures.length===0;
 return result;
}

export async function auditBaniReaderRoutes(expectedCases,audit){
 const results=[];
 for(const expected of expectedCases){
  history.pushState({...history.state},'',expected.routeUrl);
  window.dispatchEvent(new PopStateEvent('popstate'));
  results.push(await audit(expected));
 }
 return results;
}
