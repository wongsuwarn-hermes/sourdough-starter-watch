# Simon’s Sourdough Starter Watch

A public sourdough starter observatory: Fermentation Lab visual base, Living Storybook personality, and transparent Hermes/AI-agent observation.

## Current MVP

- Static site generated into `public/index.html`
- Observation data in `data/observations.json`
- Build with `npm run build`
- Test with `npm test`
- Preview locally with `npm run serve`
- Capture webcam stills with `npm run capture`
- Record manual feedings with `npm run fed -- --note "Fed 1:2:2; baseline reset."`

Public copy intentionally avoids advertising exact private hardware details.

## Deployment

A GitHub Pages workflow is included at `.github/workflows/pages.yml`. It will test, build, upload `public/`, and deploy once the repository is pushed to GitHub and Pages is enabled for GitHub Actions.

See `docs/automation.md` for local capture and monitoring notes.
