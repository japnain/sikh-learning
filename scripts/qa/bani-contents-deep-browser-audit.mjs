// Live-browser all-target navigation and all-row layout audit. No app state or scripture injection.
export async function auditContentsCase(expected,options={allTargets:true,width:390,height:844,presentation:'study'}){
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const settle=async()=>{for(let i=0;i<4;i++)await new Promise(r=>requestAnimationFrame(r));};
 const result={id:expected.id,length:expected.requestedlength,name:expected.baniName,failures:[],checks:[]};
 const end=performance.now()+35000;
 while(performance.now()<end){
  if(document.querySelectorAll('[data-reader-anchor]').length===expected.rows&&document.querySelector('[data-study-entry-id]')?.dataset.studyEntryId.startsWith(`bani-${expected.id}-`))break;
  await wait(100);
 }
 await document.fonts.ready;await settle();
 let previousTop=scrollY,stable=0;for(let i=0;i<20&&stable<3;i++){await wait(100);const nextTop=scrollY;stable=Math.abs(nextTop-previousTop)<=1?stable+1:0;previousTop=nextTop;}
 result.rows=document.querySelectorAll('[data-reader-anchor]').length;
 result.presentation=document.querySelector('[data-testid="page-study"]')?.getAttribute('data-reader-presentation');
 result.viewport={width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,dpr:devicePixelRatio};
 result.theme=document.documentElement.dataset.theme;
 result.scroller=document.scrollingElement?.tagName;
 if(result.rows!==expected.rows){result.failures.push('row-count');result.passed=false;return result;}
 if(innerWidth!==options.width||innerHeight!==options.height)result.failures.push('viewport');
 if(result.presentation!==options.presentation)result.failures.push('presentation');
 if(document.documentElement.scrollWidth>innerWidth||result.scroller!=='HTML')result.failures.push('document-layout');
 const origin=scrollY;result.originScrollY=origin;
 const open=async()=>{document.querySelector('[data-reader-header] button[aria-label="Contents"]').click();await settle();const deadline=performance.now()+3000;while(!document.querySelector('[data-testid="study-reader-sections-sheet"] input[type="search"]')&&performance.now()<deadline)await wait(50);await settle();};
 const close=async()=>{document.querySelector('[data-testid="study-reader-sections-sheet"] button[aria-label="Close"]').click();await settle();};
 await open();
 let buttons=[...document.querySelectorAll('[data-testid="bani-composition-sections"] button')];
 result.sections=buttons.length;
 if(buttons.length!==expected.sections){result.failures.push('section-count');await close();result.passed=false;return result;}
 const sheet=document.querySelector('[data-testid="study-reader-sections-sheet"]');
 const panel=sheet.querySelector('.study-reader-sections-sheet__scroll');
 const sheetRect=sheet.getBoundingClientRect();
 const closeRect=sheet.querySelector('button[aria-label="Close"]').getBoundingClientRect();
 result.layout={sheetWidth:sheet.clientWidth,scrollWidth:sheet.scrollWidth,panelWidth:panel.clientWidth,panelScrollWidth:panel.scrollWidth,sheetTop:sheetRect.top,sheetBottom:sheetRect.bottom,closeWidth:closeRect.width,closeHeight:closeRect.height,minimumRowHeight:Infinity,emptyExcerpts:0,literalLabels:0,languageFailures:[],rowFailures:[]};
 if(sheet.scrollWidth>sheet.clientWidth||panel.scrollWidth>panel.clientWidth||sheetRect.top<0||sheetRect.bottom>innerHeight+1)result.failures.push('contents-layout');
 if(closeRect.width<44||closeRect.height<44)result.failures.push('close-hit-area');
 buttons.forEach((button,index)=>{
  const expectedTarget=expected.targets[index];
  const label=button.querySelector('.study-reader-section-label > span');
  const excerpt=button.lastElementChild;
  const b=button.getBoundingClientRect(),e=excerpt.getBoundingClientRect();
  result.layout.minimumRowHeight=Math.min(result.layout.minimumRowHeight,b.height);
  if(label.textContent.trim()!==expectedTarget.label)result.layout.rowFailures.push({index,reason:'label'});
  if(!excerpt.textContent.trim()){result.layout.emptyExcerpts++;result.layout.rowFailures.push({index,reason:'empty-excerpt'});}
  if(button.scrollWidth>button.clientWidth+1||e.left<b.left-1||e.right>b.right+1||b.height<44)result.layout.rowFailures.push({index,reason:'row-layout'});
  if(/[\u0A00-\u0A7F]/u.test(label.textContent)){result.layout.literalLabels++;if(label.lang!=='pa-Guru')result.layout.languageFailures.push(index);}
 });
 if(result.layout.rowFailures.length)result.failures.push('row-layout-or-label');
 if(result.layout.languageFailures.length)result.failures.push('label-language');
 const labelCounts=new Map();expected.targets.forEach(item=>labelCounts.set(item.label,(labelCounts.get(item.label)??0)+1));
 const repeats=options.includeRepeatedLabels?expected.targets.filter(item=>labelCounts.get(item.label)>1):[];
 const sample=options.middleFirst?[expected.targets[Math.floor(expected.targets.length/2)],expected.targets[0],expected.targets.at(-1)]:[expected.targets[0],expected.targets[Math.floor(expected.targets.length/2)],expected.targets.at(-1)];
 const targets=options.allTargets?expected.targets.slice(options.targetStart??0,options.targetEnd??expected.targets.length):[...new Map([...sample,...repeats].map(t=>[t.sectionIndex,t])).values()];
 for(const item of targets){
  buttons=[...document.querySelectorAll('[data-testid="bani-composition-sections"] button')];
  buttons[item.sectionIndex].click();await settle();
  if(options.jumpPauseMs)await wait(options.jumpPauseMs);
  const target=document.querySelector(`[data-reader-anchor][data-verse-id="${item.startVerseId}"]`);
  const rect=target?.getBoundingClientRect();
  const headerBottom=document.querySelector('[data-reader-header]').getBoundingClientRect().bottom;
  const check={index:item.sectionIndex,verseId:item.startVerseId,top:rect?.top,headerBottom,visible:!!rect&&rect.top>=headerBottom-1&&rect.top<innerHeight,focused:document.activeElement===target};
  if(!check.visible)result.failures.push('target-clearance');
  if(!check.focused)result.failures.push('target-focus');
  if(!document.querySelector('[aria-label="Return to previous place"]'))result.failures.push('missing-return');
  await open();
  const current=[...(sheet.isConnected?sheet.querySelectorAll('[aria-current="location"]'):document.querySelectorAll('[data-testid="study-reader-sections-sheet"] [aria-current="location"]'))];
  check.currentCount=current.length;
  check.currentIndex=[...document.querySelectorAll('[data-testid="bani-composition-sections"] button')].indexOf(current[0]);
  check.currentLabel=current[0]?.querySelector('.study-reader-section-label > span')?.textContent?.trim();
  if(current.length!==1||check.currentIndex!==item.sectionIndex||check.currentLabel!==item.label)result.failures.push('current-location');
  result.checks.push(check);
 }
 await close();
 document.querySelector('[aria-label="Return to previous place"]')?.click();await settle();
 result.returnDelta=scrollY-origin;
 result.returnCleared=!document.querySelector('[aria-label="Return to previous place"]');
 result.returnFocusVerse=document.activeElement?.getAttribute('data-verse-id');
 if(options.requireReturnFocus&&!document.activeElement?.matches('[data-reader-anchor]'))result.failures.push('return-focus');
 if(Math.abs(result.returnDelta)>3||!result.returnCleared)result.failures.push('return-origin');
 result.state=document.querySelector('[data-testid="page-study"]')?.getAttribute('data-ai-state');
 if(result.state!=='ready')result.failures.push('reader-state');
 result.failures=[...new Set(result.failures)];
 result.passed=result.failures.length===0;
 return result;
}

export async function auditContentsRoutes(cases,audit,options){
 const results=[];
 for(const expected of cases){history.pushState({...history.state},'',expected.routeUrl);window.dispatchEvent(new PopStateEvent('popstate'));results.push(await audit(expected,options));}
 return results;
}
