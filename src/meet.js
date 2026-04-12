class Meet {
  constructor(date, title, color = "blue", host = null, status = 'pending', sheetRow = null, klas = null, lesgever = null, localId = null) {
    // Validate and set date
    if (date instanceof Date) {
      this.date = date;
    } else if (typeof date === "string" || typeof date === "number") {
      this.date = new Date(date);
    } else {
      throw new Error("Invalid date format");
    }

    // Validate date is valid
    if (isNaN(this.date.getTime())) {
      throw new Error("Invalid date");
    }

    this.title = title;
    this.color = color;
    this.host = host;
    // 'approved' | 'rejected' | 'pending'
    this.status = status;
    // 1-based row number in the Google Sheet
    this.sheetRow = sheetRow;
    // The class being visited
    this.klas = klas;
    // The professor teaching the class
    this.lesgever = lesgever;
    this.localId = localId;
  }
}

const possibleFields = ['host', 'title', 'klas', 'lesgever'];
export { Meet, possibleFields };
