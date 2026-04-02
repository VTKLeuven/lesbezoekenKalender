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

## Running tests

```bash
npm test
```

Launches Jest in interactive watch mode via `react-scripts test`.

> **Note:** `src/App.test.js` is the Create React App placeholder and will currently fail — it looks for text that does not exist in this app. Replace it with tests specific to this project before running in CI.

The testing stack is:
- [Jest](https://jestjs.io/) (via `react-scripts`)
- [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)
- [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) — custom DOM matchers (configured in `src/setupTests.js`)

---

## Other scripts

| Command | Description |
|---|---|
| `npm run build` | Production build to `build/` |
| `npm run eject` | Eject from Create React App (irreversible) |
