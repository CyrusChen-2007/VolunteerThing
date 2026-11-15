// FDI permanent-tooth quadrants: 1 upper right, 2 upper left,
// 3 lower left, 4 lower right. The bundled model contains positions 1–7.
export function dentalSuggestions(dental) {
  const selected = new Map();
  let uncertain = false, unsupported = false;
  for (const location of dental.locations) {
    if (location.area === 'wisdom') { unsupported = true; continue; }
    if (location.tooth) {
      if (location.tooth % 10 === 8) { unsupported = true; continue; }
      selected.set(location.tooth, {tooth:location.tooth, includesGum:location.includesGum});
      continue;
    }
    // A vague toothache must not claim that every tooth hurts.
    if (location.jaw === 'unspecified' && location.side === 'unspecified' && location.area === 'unspecified') { uncertain = true; continue; }
    uncertain = true;
    for (let quadrant = 1; quadrant <= 4; quadrant++) {
      const jaw = quadrant <= 2 ? 'upper' : 'lower';
      const side = [1,4].includes(quadrant) ? 'right' : 'left';
      if (location.jaw !== 'unspecified' && location.jaw !== jaw) continue;
      if (!['unspecified','both',side].includes(location.side)) continue;
      for (let position = 1; position <= 7; position++) {
        if (location.area === 'front' && position > 3 || location.area === 'back' && position < 4) continue;
        const tooth = quadrant * 10 + position;
        selected.set(tooth,{tooth,includesGum:location.includesGum || selected.get(tooth)?.includesGum || false});
      }
    }
  }
  return {selections:[...selected.values()], uncertain, unsupported};
}
