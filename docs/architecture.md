# Project Architecture

This document summarizes the architecture described in the project voice memo. The goal is to build a **Chrome Extension Website Proxy** that can monitor web traffic and store captured content in a serverless backend.

## Components

1. **Chrome Extension**
   - Runs in listen mode and captures HTML and JavaScript content from authorized pages.
   - Sends captured data to the backend using REST API calls.
   - Uses Pyodide to run most of the logic in Python within the browser context.
   - Only a thin layer of JavaScript handles browser events and invokes Python methods.

2. **FastAPI Server (Serverless)**
   - Receives data from the Chrome extension and stores it in S3.
   - Maintains no state other than the persisted files in S3.
   - Uses OS Bot `type_save` style classes to track metadata about each captured file.

3. **S3 Storage**
   - Stores the original requests and a JSON record for each captured page.
   - Files are organized using a timestamp structure: `year/month/day/hour/minute/second`.
   - A top level JSON file keeps track of the locations of all saved files.

## Workflow

1. A user visits an authorized website.
2. The Chrome extension captures page content on load.
3. The extension hashes the content to avoid duplicates and sends it to the FastAPI server.
4. The server stores the data in S3 and updates the metadata index.

## Development Approach

- Keep as much logic as possible in Python so it can be unit tested.
- Start with one repository containing the JavaScript for the extension, Python logic for the extension (via Pyodide), and the Python backend.
- Consider splitting the project into submodules later if needed.

For visual diagrams, see [diagrams.md](diagrams.md).