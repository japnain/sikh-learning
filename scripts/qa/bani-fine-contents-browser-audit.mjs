// Prepared for a live browser; syntax checking this file is not a browser pass.
// Use the 20261102 fine manifest, English UI and Gurmukhi excerpts by default.
// Run small targetStart/targetEnd batches on long readings. No scripture/state injection.
export async function auditFineContentsCase(expected, options = {}) {
  const settings = { allTargets: true, width: 390, height: 844, presentation: 'study',
    contentsLabel: 'Contents', closeLabel: 'Close', returnLabel: 'Return to previous place',
    verifyLabels: true, verifyExcerpts: true, requireReturnFocus: true, ...options };
  const result = { id: expected.id, length: expected.requestedlength, name: expected.baniName,
    failures: [], disclosures: [], checks: [], layout: { rowFailures: [], minimumHitHeight: null } };
  const fail = reason => result.failures.push(reason);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  // Jumps defer work across two RAFs. A fixed millisecond pause alone is insufficient.
  const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => requestAnimationFrame(resolve)); };
  const sheet = () => document.querySelector('[data-testid="study-reader-sections-sheet"]');
  const list = () => sheet()?.querySelector('[data-testid="bani-composition-sections"]');
  const links = () => [...(list()?.querySelectorAll('[data-reader-section-link]') ?? [])];
  const toggles = () => [...(list()?.querySelectorAll('[data-reader-section-toggle]') ?? [])];
  const link = id => links().find(node => node.dataset.readerSectionLink === id);
  const toggle = id => toggles().find(node => node.dataset.readerSectionToggle === id);
  const expectedById = new Map(expected.targets.map(target => [target.sectionId, target]));
  const collapsedCurrentChildren = new Map();
  const byLabel = (root, label) => [...(root?.querySelectorAll('button[aria-label]') ?? [])].find(node => node.getAttribute('aria-label') === label);
  const current = () => [...(sheet()?.querySelectorAll('[aria-current="location"]') ?? [])];
  const readingReady = () => document.querySelectorAll('[data-reader-anchor]').length === expected.rows
    && document.querySelector('[data-study-entry-id]')?.dataset.studyEntryId.startsWith(`bani-${expected.id}-`);
  const deadline = performance.now() + 35000;
  while (!readingReady() && performance.now() < deadline) await wait(100);
  await document.fonts.ready;
  await settle();
  let previousTop = scrollY, stable = 0;
  for (let i = 0; i < 20 && stable < 3; i++) {
    await wait(100);
    stable = Math.abs(scrollY - previousTop) <= 1 ? stable + 1 : 0;
    previousTop = scrollY;
  }
  result.rows = document.querySelectorAll('[data-reader-anchor]').length;
  result.viewport = { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth };
  result.presentation = document.querySelector('[data-testid="page-study"]')?.dataset.readerPresentation;
  result.scroller = document.scrollingElement?.tagName;
  if (!readingReady()) { fail('reading-not-ready'); return { ...result, passed: false }; }
  if (innerWidth !== settings.width || innerHeight !== settings.height) fail('viewport');
  if (result.presentation !== settings.presentation) fail('presentation');
  if (document.documentElement.scrollWidth > innerWidth || result.scroller !== 'HTML') fail('document-layout');
  // An existing exploration has a different Return origin. Do not silently accept it.
  if (byLabel(document, settings.returnLabel)) return { ...result, failures: [...result.failures, 'preexisting-exploration'], passed: false };
  const open = async () => {
    if (!sheet()) {
      const button = byLabel(document.querySelector('[data-reader-header]'), settings.contentsLabel);
      if (!button) throw new Error('missing-contents-trigger');
      button.click(); await settle();
    }
    const until = performance.now() + 3000;
    while (!sheet()?.querySelector('input[type="search"]') && performance.now() < until) await wait(50);
    await settle();
    if (!list()) throw new Error('missing-composition-list');
  };
  const close = async () => {
    if (!sheet()) return;
    const button = byLabel(sheet(), settings.closeLabel);
    if (!button) throw new Error('missing-close-trigger');
    button.click(); await settle();
  };
  const expand = async (id, wanted) => {
    const button = toggle(id);
    if (!button) throw new Error(`missing-disclosure:${id}`);
    if ((button.getAttribute('aria-expanded') === 'true') === wanted) return;
    const top = scrollY, progress = localStorage.getItem('sikh-progress');
    const places = localStorage.getItem('naamras-reading-places');
    const beforeIds = current().map(node => node.dataset.readerSectionLink);
    const before = beforeIds.length === 1 ? expectedById.get(beforeIds[0]) : null;
    const group = [...(list()?.querySelectorAll('[data-reader-section-group]') ?? [])]
      .find(node => node.dataset.readerSectionGroup === id);
    const revealsCurrentChild = wanted && before?.sectionId === id && group?.dataset.currentAncestor === 'true';
    if (!wanted && before?.parentId === id) collapsedCurrentChildren.set(id, before.sectionId);
    button.click(); await settle();
    const panelId = button.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : null;
    const afterIds = current().map(node => node.dataset.readerSectionLink);
    const expectedIds = !wanted && before?.parentId === id ? [id]
      : revealsCurrentChild && collapsedCurrentChildren.has(id) ? [collapsedCurrentChildren.get(id)] : beforeIds;
    // A child revealed without an earlier collapse still must belong to this parent.
    const currentCorrect = revealsCurrentChild && !collapsedCurrentChildren.has(id)
      ? afterIds.length === 1 && expectedById.get(afterIds[0])?.parentId === id
      : JSON.stringify(afterIds) === JSON.stringify(expectedIds);
    const check = { sectionId: id, expanded: wanted, scrollDelta: scrollY - top,
      stateCorrect: button.getAttribute('aria-expanded') === String(wanted),
      panelCorrect: !!panel && panel.hidden !== wanted,
      progressUnchanged: localStorage.getItem('sikh-progress') === progress,
      savedPlacesUnchanged: localStorage.getItem('naamras-reading-places') === places,
      currentBefore: beforeIds, currentAfter: afterIds, currentCorrect };
    result.disclosures.push(check);
    if (Math.abs(check.scrollDelta) > 1 || !check.progressUnchanged || !check.savedPlacesUnchanged) fail('disclosure-moved-reading');
    if (!check.stateCorrect || !check.panelCorrect) fail('disclosure-state');
    if (!check.currentCorrect) fail('disclosure-current-location');
    if (afterIds.length > 1) fail('multiple-current-markers');
  };
  const inspectRows = () => {
    const panel = sheet().querySelector('.study-reader-sections-sheet__scroll');
    const bounds = sheet().getBoundingClientRect();
    if (!panel || sheet().scrollWidth > sheet().clientWidth + 1 || panel.scrollWidth > panel.clientWidth + 1
      || bounds.top < -1 || bounds.bottom > innerHeight + 1) fail('contents-layout');
    for (const button of [...links(), ...toggles(), byLabel(sheet(), settings.closeLabel)].filter(Boolean)) {
      const rect = button.getBoundingClientRect();
      result.layout.minimumHitHeight = Math.min(result.layout.minimumHitHeight ?? Infinity, rect.height);
      if (rect.height < 44 || rect.width < 44 || button.scrollWidth > button.clientWidth + 1) {
        result.layout.rowFailures.push({ id: button.dataset.readerSectionLink ?? button.dataset.readerSectionToggle ?? 'close', reason: 'hit-area-or-overflow' });
      }
      if (!button.hasAttribute('data-reader-section-link')) continue;
      const item = expectedById.get(button.dataset.readerSectionLink);
      const label = button.querySelector('.study-reader-section-label > span');
      const excerpt = button.lastElementChild;
      const text = excerpt?.textContent?.trim();
      if (!item || !label || !text) { fail('missing-row-content'); continue; }
      if (settings.verifyLabels && label.textContent.trim() !== item.label) fail('row-label');
      if (settings.verifyExcerpts && text !== item.excerpt.trim()) fail('row-excerpt');
      const excerptRect = excerpt.getBoundingClientRect();
      if (excerptRect.left < rect.left - 1 || excerptRect.right > rect.right + 1) fail('excerpt-overflow');
      if (/[\u0A00-\u0A7F]/u.test(label.textContent) && label.lang !== 'pa-Guru') fail('literal-label-language');
    }
    if (result.layout.rowFailures.length) fail('row-layout');
  };
  let origin;
  try {
    await close(); origin = scrollY; result.originScrollY = origin;
    await open();
    result.initiallyExpanded = toggles().filter(button => button.getAttribute('aria-expanded') === 'true').map(button => button.dataset.readerSectionToggle);
    const groups = expected.tree.filter(root => root.children?.length);
    if (toggles().length !== groups.length) fail('disclosure-count');
    for (const root of groups) await expand(root.sectionId, false);
    result.collapsedLinks = links().length;
    if (result.collapsedLinks !== expected.rootSections) fail('collapsed-root-count');
    inspectRows();
    for (const root of groups) await expand(root.sectionId, true);
    result.expandedLinks = links().length;
    result.expandedChildLinks = links().filter(button => expected.targets.find(target => target.sectionId === button.dataset.readerSectionLink)?.parentId).length;
    if (result.expandedLinks !== expected.sections || result.expandedChildLinks !== expected.childSections) fail('expanded-target-count');
    inspectRows();
    const sample = [expected.targets[Math.floor(expected.targets.length / 2)], expected.targets[0], expected.targets.at(-1)].filter(Boolean);
    const selected = settings.allTargets ? expected.targets.slice(settings.targetStart ?? 0, settings.targetEnd ?? expected.targets.length)
      : [...new Map(sample.map(target => [target.sectionId, target])).values()];
    for (const item of selected) {
      if (item.parentId) await expand(item.parentId, true);
      const button = link(item.sectionId);
      if (!button) throw new Error(`missing-target:${item.sectionId}`);
      button.click(); await settle();
      if (settings.jumpPauseMs) await wait(settings.jumpPauseMs);
      const target = [...document.querySelectorAll('[data-reader-anchor]')].find(node => Number(node.dataset.verseId) === item.targetId);
      const rect = target?.getBoundingClientRect();
      const headerBottom = document.querySelector('[data-reader-header]')?.getBoundingClientRect().bottom;
      const check = { sectionId: item.sectionId, targetId: item.targetId, top: rect?.top, headerBottom,
        visible: !!rect && Number.isFinite(headerBottom) && rect.top >= headerBottom - 1 && rect.top < innerHeight,
        focused: document.activeElement === target, sheetClosed: !sheet() };
      if (!check.visible) fail('target-clearance');
      if (!check.focused) fail('target-focus');
      if (!check.sheetClosed) fail('jump-did-not-close');
      if (!byLabel(document, settings.returnLabel)) fail('missing-return');
      await open();
      const currentNodes = current();
      check.currentIds = currentNodes.map(node => node.dataset.readerSectionLink);
      if (check.currentIds.length !== 1 || check.currentIds[0] !== item.expectedDeepestCurrentId) fail('current-location');
      const currentRect = currentNodes[0]?.getBoundingClientRect();
      const panelRect = sheet()?.querySelector('.study-reader-sections-sheet__scroll')?.getBoundingClientRect();
      check.currentViewport = currentRect && panelRect ? {
        top: currentRect.top, bottom: currentRect.bottom,
        panelTop: panelRect.top, panelBottom: panelRect.bottom,
        fits: currentRect.height <= panelRect.height + 1,
      } : null;
      // Oversized rows must intersect the panel; a row that fits must be fully visible.
      check.currentVisible = !!currentRect && !!panelRect
        && currentRect.bottom > panelRect.top && currentRect.top < panelRect.bottom
        && (currentRect.height > panelRect.height + 1
          || (currentRect.top >= panelRect.top - 1 && currentRect.bottom <= panelRect.bottom + 1));
      if (!check.currentVisible) fail('current-location-offscreen');
      const ancestorIds = item.expectedCurrentPathIds.slice(0, -1);
      check.currentAncestorsExpanded = ancestorIds.every(id => toggle(id)?.getAttribute('aria-expanded') === 'true');
      if (!check.currentAncestorsExpanded) fail('current-child-not-revealed');
      result.checks.push(check);
    }
  } catch (error) {
    fail(`audit-error:${error instanceof Error ? error.message : String(error)}`);
  } finally {
    try { await close(); } catch (error) { fail(`cleanup-close:${String(error)}`); }
    const returnButton = byLabel(document, settings.returnLabel);
    if (returnButton) { returnButton.click(); await settle(); }
    result.returnDelta = origin === undefined ? null : scrollY - origin;
    result.returnCleared = !byLabel(document, settings.returnLabel);
    result.returnFocusVerse = document.activeElement?.getAttribute('data-verse-id');
    if (result.checks.length && settings.requireReturnFocus && !document.activeElement?.matches('[data-reader-anchor]')) fail('return-focus');
    if ((result.returnDelta !== null && Math.abs(result.returnDelta) > 3) || !result.returnCleared) fail('return-origin');
  }
  result.state = document.querySelector('[data-testid="page-study"]')?.getAttribute('data-ai-state');
  if (result.state !== 'ready') fail('reader-state');
  result.failures = [...new Set(result.failures)];
  result.passed = result.failures.length === 0;
  return result;
}
