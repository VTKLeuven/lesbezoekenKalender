import { Meet } from "./meet.js";
import { colorClasses } from "./colorClasses.js";

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
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
    for (const obj of data) {
      const newMeet = new Meet(new Date(obj.Timestamp), obj.Organisatie);
      newMeet.host = obj.Organisatie;
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
