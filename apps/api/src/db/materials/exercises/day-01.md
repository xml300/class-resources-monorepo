# Day 1: Programming Basics in JS & Intro to Node.js

## Coding Exercises

### Exercise 1.1 — Temperature & Discount Calculator
Write a function `calculateTotal(price, isMember, couponCode)` that applies a 15% discount for members, an extra \$5 off if `couponCode === "SAVE5"`, and never returns a negative total.

### Exercise 1.2 — Gradebook Analyzer
Given an array of `{ name, score }` objects, write a `summarizeGrades(students)` function that returns `{ highest, lowest, average, passingNames }`, where a passing score is `70` or higher.

### Exercise 1.3 — Inventory Filter
Write a `getLowStock(items, threshold = 5)` function using `.filter()` and `.map()` that returns formatted strings like `"Keyboard (2 left)"` for any item below the threshold.

### Exercise 1.4 — Word Frequency Counter
Write a `countWords(sentence)` function that splits a string into lowercase words and returns an object mapping each word to how many times it appears (for example, `{ hello: 2, world: 1 }`).

### Exercise 1.5 — CLI Greeter
Write a script `greet.js` that reads a name and an optional `--shout` flag from `process.argv`. Running `node greet.js Ada --shout` should print `"HELLO, ADA!"`.

### Exercise 1.6 — File Line Counter
Write a script that reads a text file passed via `process.argv[2]`, counts the total lines and non-empty lines, and prints the summary to the terminal.

---

## Mini-Project: `todo-cli` (JSON-Backed CLI Utility)

Build a command-line task manager in JavaScript that saves your tasks to `data.json`.

### Core (Required)
* `node todo.js add "Buy milk"` — appends `{ id, title, done: false, createdAt }` to `data.json`.
* `node todo.js list` — prints all tasks with `[ ]` or `[x]` status.
* `node todo.js done <id>` — marks the matching task complete and saves `data.json`.
* Automatically create `data.json` with `[]` on first run if it does not exist yet.

### Stretch
* Add `node todo.js remove <id>` to delete a task.
* Add filtering flags: `node todo.js list --pending` and `node todo.js list --done`.
* Print a summary line at the bottom (for example: `2/5 completed`).

### Challenge
* Add `node todo.js export csv` to write your tasks to `todos.csv` with a header row.
* Validate user input so empty titles or invalid IDs print a clear error message and set `process.exitCode = 1`.
