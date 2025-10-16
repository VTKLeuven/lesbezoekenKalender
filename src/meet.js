class Meet {
  constructor(date, title, color = "blue") {
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
  }
}
export { Meet };
