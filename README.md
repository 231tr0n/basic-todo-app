# basic-todo-app

A kanban todo application with a Spring Boot backend and an Angular Material frontend.

- `todo-spring` – REST API, JWT cookie authentication and a Spring AI MCP server.
- `todo-angular-client` – Angular 22 kanban board, account dialogs and an AI chat assistant.

## Features

- Kanban board with three columns (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`) and drag-and-drop.
- Todo create/edit/delete dialogs, sign-in/sign-up and light/dark themes.
- AI assistant that talks to the backend through MCP tools.
- In-browser MCP server that exposes Angular Material inputs (select, combobox, date picker,
  time input, text, confirmation) to the assistant.

## Run locally

Start PostgreSQL/MariaDB or use the `test` profile (H2):

```bash
cd todo-spring
mvn spring-boot:run
```

In another terminal:

```bash
cd todo-angular-client
npm install
npm start
```

The frontend runs on <http://localhost:4200> and proxies `/api` and `/mcp` to the backend.
The backend in turn connects to Ollama, so the browser never talks to it directly.

## Ollama

The assistant uses Ollama's OpenAI-compatible API. The backend proxies it under `/api/ai`,
configured with `todo.ai.base-url` (default `http://localhost:11434`). The default model is
`bonsai-2:2b`:

```bash
ollama pull bonsai-2:2b
```

Pull and select any other tool-capable model from the chat toolbar if preferred.

## MCP

The backend exposes every user and todo service method as an MCP tool at `/mcp`
(streamable HTTP). The Angular chat client discovers those tools at runtime and routes
`ui_`-prefixed tool calls to the in-browser MCP server instead.
