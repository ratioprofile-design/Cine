import * as XLSX from 'xlsx';
import { Scene, BreakdownItem } from '../types/production';
import { formatEighths } from './scriptParser';

export interface SpreadsheetParseResult {
  scenes: Scene[];
  scriptText: string;
}

/**
 * Parses an Excel (.xlsx, .xls, .csv) file or Google Sheets export into structured scenes.
 */
export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  return parseTableRows(rows);
}

/**
 * Parses tab-separated text directly pasted from Google Sheets or Excel.
 */
export function parsePastedTable(tsvText: string): SpreadsheetParseResult {
  if (!tsvText || !tsvText.trim()) {
    return { scenes: [], scriptText: '' };
  }

  const lines = tsvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.map((line) => line.split('\t'));
  return parseTableRows(rows);
}

function parseTableRows(rows: any[][]): SpreadsheetParseResult {
  if (!rows || rows.length < 2) {
    return { scenes: [], scriptText: '' };
  }

  // Find header row indices
  const headerRow = rows[0].map((h) => String(h).trim().toLowerCase());

  let sceneNumIdx = -1;
  let intExtIdx = -1;
  let locationIdx = -1;
  let timeIdx = -1;
  let descIdx = -1;
  let castIdx = -1;
  let propsIdx = -1;
  let stuntsIdx = -1;
  let pagesIdx = -1;

  for (let i = 0; i < headerRow.length; i++) {
    const col = headerRow[i];
    if (col.includes('scene') || col.includes('காட்சி') || col === 'sc #' || col === 'no') {
      sceneNumIdx = i;
    } else if (col.includes('int') || col.includes('ext') || col.includes('உள்') || col.includes('வெளி') || col.includes('i/e')) {
      intExtIdx = i;
    } else if (col.includes('loc') || col.includes('இடம்') || col.includes('set')) {
      locationIdx = i;
    } else if (col.includes('day') || col.includes('night') || col.includes('நேரம்') || col.includes('time')) {
      timeIdx = i;
    } else if (col.includes('desc') || col.includes('synopsis') || col.includes('action') || col.includes('விவரம்') || col.includes('story')) {
      descIdx = i;
    } else if (col.includes('cast') || col.includes('actor') || col.includes('char') || col.includes('நடிகர்')) {
      castIdx = i;
    } else if (col.includes('prop') || col.includes('பொருள்')) {
      propsIdx = i;
    } else if (col.includes('stunt') || col.includes('action') || col.includes('சண்டை')) {
      stuntsIdx = i;
    } else if (col.includes('page') || col.includes('பக்கம்') || col.includes('eighth')) {
      pagesIdx = i;
    }
  }

  // Fallbacks if not detected by header name
  if (sceneNumIdx === -1) sceneNumIdx = 0;
  if (intExtIdx === -1 && rows[0].length > 1) intExtIdx = 1;
  if (locationIdx === -1 && rows[0].length > 2) locationIdx = 2;
  if (timeIdx === -1 && rows[0].length > 3) timeIdx = 3;
  if (descIdx === -1 && rows[0].length > 4) descIdx = 4;

  const scenes: Scene[] = [];
  const scriptLines: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every((c: any) => String(c).trim() === '')) continue;

    const rawSceneNum = String(row[sceneNumIdx] || r).trim();
    const rawIntExt = String(row[intExtIdx] || 'INT').toUpperCase().trim();
    const rawLoc = String(row[locationIdx] || 'LOCATION').trim();
    const rawTime = String(row[timeIdx] || 'DAY').toUpperCase().trim();
    const rawDesc = String(row[descIdx] || '').trim();
    const rawCast = castIdx !== -1 ? String(row[castIdx] || '').trim() : '';
    const rawProps = propsIdx !== -1 ? String(row[propsIdx] || '').trim() : '';
    const rawStunts = stuntsIdx !== -1 ? String(row[stuntsIdx] || '').trim() : '';
    const rawPages = pagesIdx !== -1 ? String(row[pagesIdx] || '1/8').trim() : '1/8';

    const intExt: any = rawIntExt.includes('EXT') ? 'EXT' : rawIntExt.includes('வெளி') ? 'வெளி' : 'INT';
    const timeOfDay: any = rawTime.includes('NIGHT') || rawTime.includes('இரவு') ? 'NIGHT' : 'DAY';

    let eighths = 1;
    if (rawPages.includes('/8')) {
      const parts = rawPages.split('/');
      eighths = parseInt(parts[0], 10) || 1;
    } else {
      eighths = Math.max(1, Math.round((parseFloat(rawPages) || 0.125) * 8));
    }

    const heading = `${intExt}. ${rawLoc} - ${timeOfDay}`;
    const breakdownItems: BreakdownItem[] = [];

    // Cast from column
    if (rawCast) {
      const castNames = rawCast.split(/[,;\n]/).map((c) => c.trim()).filter(Boolean);
      castNames.forEach((c, idx) => {
        breakdownItems.push({
          id: `bi-cast-${r}-${idx}`,
          category: 'CAST',
          name: c,
          count: 1,
        });
      });
    }

    // Props from column
    if (rawProps) {
      const propNames = rawProps.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
      propNames.forEach((p, idx) => {
        breakdownItems.push({
          id: `bi-prop-${r}-${idx}`,
          category: 'PROPS',
          name: p,
          count: 1,
        });
      });
    }

    // Stunts from column
    if (rawStunts) {
      const stuntNames = rawStunts.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
      stuntNames.forEach((s, idx) => {
        breakdownItems.push({
          id: `bi-stunt-${r}-${idx}`,
          category: 'STUNTS',
          name: s,
          count: 1,
        });
      });
    }

    const scene: Scene = {
      id: `scene-sheet-${r}`,
      sceneNumber: rawSceneNum,
      intExt,
      location: rawLoc,
      timeOfDay,
      rawHeading: heading,
      pagesEighths: eighths,
      formattedPages: formatEighths(eighths),
      synopsis: rawDesc,
      rawScript: `${heading}\n\n${rawDesc}\n\n${rawCast ? `CAST: ${rawCast}\n` : ''}`,
      elements: [
        { id: `el-${r}-slug`, type: 'SLUGLINE', text: heading },
        { id: `el-${r}-act`, type: 'ACTION', text: rawDesc },
      ],
      breakdownItems,
      shootingDay: Math.ceil(r / 4),
    };

    scenes.push(scene);

    scriptLines.push(heading);
    if (rawDesc) scriptLines.push(rawDesc);
    scriptLines.push('');
  }

  return {
    scenes,
    scriptText: scriptLines.join('\n'),
  };
}
