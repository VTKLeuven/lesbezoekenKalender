# Lesbezoeken Calendar

A React calendar app for tracking school/class visits (*lesbezoeken*). Events are fetched from a Google Apps Script web app and displayed in month, week, or day view. Each organisation is automatically assigned a colour. Events auto-refresh every 2 minutes and can be filtered by field value.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (comes with Node)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `src/sensitiveData.js`

This file is not committed. Create it manually:

```js
// src/sensitiveData.js
export const webAppUrl = "https://script.google.com/macros/s/<your-deployment-id>/exec";
export const apiKey = "<your-api-key>";
```

Both values come from your Google Apps Script deployment.

---

## Running the app

```bash
npm start
```

Opens at [http://localhost:3000](http://localhost:3000). The page reloads on file changes.

---
