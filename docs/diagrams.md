# Architecture Diagrams

The following Mermaid diagrams illustrate the high-level architecture and data flow of the **Chrome Extension Website Proxy** project.

## High-Level Components

```mermaid
graph TD
    user([User]) -->|Browse| extension["Chrome Extension"]
    extension --> pyodide["Pyodide (Python)"]
    extension --> jsLayer["JavaScript Layer"]
    extension -- "REST API" --> fastapi["FastAPI Server (Serverless)"]
    fastapi --> s3[S3 Storage]
```

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant E as Chrome Extension
    participant F as FastAPI
    participant S as S3 Storage

    U->>E: Browse authorized page
    E->>F: Send captured HTML/JS
    F->>S: Save files and update metadata
```
