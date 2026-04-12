import { Meet } from "./meet.js";
import { colorClasses } from "./colorClasses.js";

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Determine approval status from a Google Sheets background hex color.
 * Green-dominant  → approved
 * Red-dominant    → rejected
 * White / no color / anything else → pending
 */
function getStatusFromBgColor(bgColor) {
  if (!bgColor || bgColor === '#ffffff' || bgColor === 'white') return 'pending';
  const hex = bgColor.replace('#', '');
  if (hex.length !== 6) return 'pending';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (g > r && g > b) return 'approved';
  if (r > g && r > b) return 'rejected';
  return 'pending';
}

/**
 * Parse a timestamp value, which may be:
 *   - datetime-local string: "2026-04-08T10:00"          (from admin form, local time)
 *   - ISO string:            "2026-04-08T10:00:00.000Z"  (UTC)
 *   - Sheet locale string:   "6-9-2025 7:49:14"          (DD-M-YYYY H:mm:ss, Belgian)
 *   - Already a number (ms epoch)
 * Returns a valid Date or null.
 */
function parseSheetDate(raw) {
  if (!raw) return null;
  // Already a number (epoch ms)
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return isNaN(d) ? null : d;
  }
  const s = String(raw).trim();
  // datetime-local or ISO: YYYY-MM-DD... — safe to parse directly
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  // Sheet locale format: DD-M-YYYY H:mm:ss or D/M/YYYY H:mm:ss
  // Swap day and month so JS reads it as MM/DD/YYYY
  const swapped = s.replace(
    /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/,
    (_, d, m, y) => `${m}/${d}/${y}`
  );
  const d2 = new Date(swapped);
  return isNaN(d2) ? null : d2;
}

// temp fix met copied colorClasses, could do on actual file if you have proper teardown
export async function callWebApp() {
  let colorClassesCopy = structuredClone(colorClasses);
  try {
    const response = await fetch('/api/data', { headers: getAuthHeader() });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const meets = [];
    const organisationsColorMap = new Map();
    let globalFullColorFlag = false;
    for (let idx = 0; idx < data.length; idx++) {
      const obj = data[idx];
      const parsedDate = parseSheetDate(obj.Timestamp);
      if (!parsedDate) {
        console.warn(`Skipping row ${idx + 2}: unparseable Timestamp "${obj.Timestamp}"`);
        continue;
      }
      const status = getStatusFromBgColor(obj.bgColor);
      // Use sheetRow from Apps Script if available; fall back to index + 2 (assuming 1 header row)
      const sheetRow = typeof obj.sheetRow === 'number' ? obj.sheetRow : idx + 2;
      const newMeet = new Meet(
        parsedDate,
        obj.Organisatie,
        "blue",
        obj.Organisatie,
        status,
        sheetRow,
        obj.Klas || null,
        obj.Lesgever || null,
        obj.localId || null
      );
      if (organisationsColorMap.has(obj.Organisatie)) {
        newMeet.color = organisationsColorMap.get(obj.Organisatie);
      } else {
        if (globalFullColorFlag) {
          newMeet.color = colorClasses.red;
          organisationsColorMap.set(obj.Organisatie, colorClasses.red);
        } else {
          let fullColorFlag = true;
          for (const colorName of Object.keys(colorClassesCopy)) {
            let color = colorClassesCopy[colorName];
            if (color.organisation == null) {
              fullColorFlag = false;
              newMeet.color = color;
              organisationsColorMap.set(obj.Organisatie, color);
              colorClassesCopy[colorName].organisation = obj.Organisatie;
              break;
            }
          }
          // If no more colors are available
          if (fullColorFlag) {
            globalFullColorFlag = true;
            newMeet.color = colorClasses.red;
            organisationsColorMap.set(obj.Organisatie, colorClasses.red);
          }
        }
      }
      meets.push(newMeet);
    }
    return [meets, organisationsColorMap];
  } catch (error) {
    console.error("Error: ", error.message);
    throw error;
  }
}
