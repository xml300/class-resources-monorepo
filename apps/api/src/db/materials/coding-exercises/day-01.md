# Day 1: Programming Basics in JS & Intro to Node.js

## Coding Exercises

### Exercise 1.1 — Temperature & Discount Calculator
Write a function `calculateTotal(price, isMember, couponCode)` that applies a 15% discount for members, an extra \$5 off if `couponCode === "SAVE5"`, and never returns a negative total.

### Exercise 1.2 — Gradebook Analyzer
Given an array of `{ name, score }` objects, write a `summarizeGrades(students)` function that returns `{ highest, lowest, average, passingNames }`, where a passing score is `70` or higher.

### Exercise 1.3 — Inventory Filter
Write a `getLowStock(items, threshold = 5)` function that returns formatted strings like `"Keyboard (2 left)"` for any item below the threshold.

### Exercise 1.4 — Word Frequency Counter
Write a `countWords(sentence)` function that splits a string into lowercase words and returns an object mapping each word to how many times it appears.

### Exercise 1.5 — CLI Greeter
Write a script `greet.js` that accepts a name and an optional `--shout` flag from the command line. Running `node greet.js Ada --shout` should print `"HELLO, ADA!"`.

### Exercise 1.6 — File Line Counter
Write a script that accepts a file path as a command-line argument, counts the total lines and non-empty lines, and prints the summary to the terminal.
