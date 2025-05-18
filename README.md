# Browser-Proxy

A proof-of-concept Chrome extension that acts as a website proxy by capturing page content and storing it server side. The extension communicates with a FastAPI backend that saves files to S3.

See [docs/architecture.md](docs/architecture.md) for a detailed overview of the planned architecture. The [docs/diagrams.md](docs/diagrams.md) file contains visual diagrams of the system.

## Chrome extension: Resource Logger

An MVP extension is provided in the `resource-logger-extension` folder. It logs all network resources loaded on pages under `https://docs.diniscruz.ai/` to the browser console.

To load the extension in Chrome:

1. Navigate to `chrome://extensions` in the browser.
2. Enable "Developer mode".
3. Choose "Load unpacked" and select the `resource-logger-extension` directory.

Visit `https://docs.diniscruz.ai/` and open the Developer Tools console to see the logged resource URLs.
