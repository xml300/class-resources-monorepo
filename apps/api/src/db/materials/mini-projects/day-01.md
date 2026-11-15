# Day 1: Programming Basics in JS & Intro to Node.js

## Mini-Project: `todo-cli`

Build a command-line task manager in JavaScript that saves your tasks to `data.json`.

### Core (Required)
* `node todo.js add "Buy milk"` — appends `{ id, title, done: false, createdAt }` to `data.json`.
* `node todo.js list` — prints all tasks with `[ ]` or `[x]` status.
* `node todo.js done <id>` — marks the matching task complete and saves `data.json`.
* Automatically create `data.json` with `[]` on first run if it does not exist yet.

### Stretch
* Add `node todo.js remove <id>` to delete a task.
* Add filtering flags: `node todo.js list --pending` and `node todo.js list --done`.
* Print a summary line at the bottom showing completed vs. total tasks.

### Challenge
* Add `node todo.js export csv` to write your tasks to `todos.csv` with a header row.
* Validate user input so empty titles or invalid IDs print a clear error message and exit with a non-zero status code.
