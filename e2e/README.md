# Browser smoke tests

Playwright tests that open every page of the frontend and check the main
paths: start page, gene page, dataset catalog, a shared link, the theme switch.
The API is answered from the fixtures in `fixtures/`, so no backend is needed.

The tools live in this folder with their own `package.json`, apart from the
application's dependencies.

## Run

```bash
cd Frontend/e2e
npm install
npx playwright install chromium   # once
npx playwright test
```

The tests use a frontend that is already running on `http://localhost:3002`
(for example the dev server). Without one they serve the production build
from `Frontend/build` (`serve-build.js`), so build first:

```bash
cd Frontend
npx react-scripts build
```

Settings (environment variables):

| Variable | Default | Meaning |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:3002` | Address of the frontend under test |
| `E2E_BUILD_DIR` | `../build` | Build folder that `serve-build.js` serves |

## Fixtures

`fixtures/*.json` are trimmed answers of the real API (`/getDatasets`,
`/api/v1/datasets`, `/api/v1/genes`). Requests without a fixture get a 404, which
the pages must survive: an uncaught error or the error boundary fails the test.
