import { Scene, DiffResult, BreakdownItem } from '../types/production';

export interface VersionComparisonSummary {
  results: DiffResult[];
  addedScenesCount: number;
  removedScenesCount: number;
  modifiedScenesCount: number;
  unchangedScenesCount: number;
  newProps: BreakdownItem[];
  newStunts: BreakdownItem[];
  newCast: BreakdownItem[];
  netPageShiftEighths: number;
}

export function compareScriptVersions(scenesA: Scene[], scenesB: Scene[]): VersionComparisonSummary {
  const mapA = new Map<string, Scene>();
  const mapB = new Map<string, Scene>();

  // Map by normalized scene number or ID
  scenesA.forEach((s) => mapA.set(s.sceneNumber.trim(), s));
  scenesB.forEach((s) => mapB.set(s.sceneNumber.trim(), s));

  const allSceneNumbers = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort((a, b) => {
    const numA = parseInt(a, 10) || 0;
    const numB = parseInt(b, 10) || 0;
    return numA - numB;
  });

  const results: DiffResult[] = [];
  const newPropsList: BreakdownItem[] = [];
  const newStuntsList: BreakdownItem[] = [];
  const newCastList: BreakdownItem[] = [];

  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;
  let totalPageShift = 0;

  for (const sceneNum of allSceneNumbers) {
    const sceneA = mapA.get(sceneNum);
    const sceneB = mapB.get(sceneNum);

    if (!sceneA && sceneB) {
      // Added in Revision B
      addedCount++;
      const pageShift = sceneB.pagesEighths;
      totalPageShift += pageShift;

      // Extract new production items
      sceneB.breakdownItems.forEach((item) => {
        if (item.category === 'PROPS') newPropsList.push(item);
        if (item.category === 'STUNTS') newStuntsList.push(item);
        if (item.category === 'CAST') newCastList.push(item);
      });

      results.push({
        sceneId: sceneB.id,
        sceneNumber: sceneNum,
        status: 'ADDED',
        titleB: sceneB.rawHeading,
        textB: sceneB.rawScript,
        addedItems: sceneB.breakdownItems,
        removedItems: [],
        pageShiftEighths: pageShift,
      });
    } else if (sceneA && !sceneB) {
      // Removed in Revision B
      removedCount++;
      const pageShift = -sceneA.pagesEighths;
      totalPageShift += pageShift;

      results.push({
        sceneId: sceneA.id,
        sceneNumber: sceneNum,
        status: 'REMOVED',
        titleA: sceneA.rawHeading,
        textA: sceneA.rawScript,
        addedItems: [],
        removedItems: sceneA.breakdownItems,
        pageShiftEighths: pageShift,
      });
    } else if (sceneA && sceneB) {
      // Both exist - compare text and items
      const textChanged = sceneA.rawScript.trim() !== sceneB.rawScript.trim();
      const pageShift = sceneB.pagesEighths - sceneA.pagesEighths;
      totalPageShift += pageShift;

      // Item delta
      const namesA = new Set(sceneA.breakdownItems.map((i) => `${i.category}:${i.name.toLowerCase()}`));
      const namesB = new Set(sceneB.breakdownItems.map((i) => `${i.category}:${i.name.toLowerCase()}`));

      const addedItems = sceneB.breakdownItems.filter((i) => !namesA.has(`${i.category}:${i.name.toLowerCase()}`));
      const removedItems = sceneA.breakdownItems.filter((i) => !namesB.has(`${i.category}:${i.name.toLowerCase()}`));

      addedItems.forEach((item) => {
        if (item.category === 'PROPS') newPropsList.push(item);
        if (item.category === 'STUNTS') newStuntsList.push(item);
        if (item.category === 'CAST') newCastList.push(item);
      });

      if (textChanged || addedItems.length > 0 || removedItems.length > 0 || pageShift !== 0) {
        modifiedCount++;
        results.push({
          sceneId: sceneB.id,
          sceneNumber: sceneNum,
          status: 'MODIFIED',
          titleA: sceneA.rawHeading,
          titleB: sceneB.rawHeading,
          textA: sceneA.rawScript,
          textB: sceneB.rawScript,
          addedItems,
          removedItems,
          pageShiftEighths: pageShift,
        });
      } else {
        unchangedCount++;
        results.push({
          sceneId: sceneB.id,
          sceneNumber: sceneNum,
          status: 'UNCHANGED',
          titleA: sceneA.rawHeading,
          titleB: sceneB.rawHeading,
          textA: sceneA.rawScript,
          textB: sceneB.rawScript,
          addedItems: [],
          removedItems: [],
          pageShiftEighths: 0,
        });
      }
    }
  }

  return {
    results,
    addedScenesCount: addedCount,
    removedScenesCount: removedCount,
    modifiedScenesCount: modifiedCount,
    unchangedScenesCount: unchangedCount,
    newProps: deduplicateItems(newPropsList),
    newStunts: deduplicateItems(newStuntsList),
    newCast: deduplicateItems(newCastList),
    netPageShiftEighths: totalPageShift,
  };
}

function deduplicateItems(items: BreakdownItem[]): BreakdownItem[] {
  const seen = new Set<string>();
  const out: BreakdownItem[] = [];
  for (const item of items) {
    const key = item.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
