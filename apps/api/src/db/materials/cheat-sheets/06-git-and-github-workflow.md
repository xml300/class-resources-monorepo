# Cheat Sheet: Git & GitHub Class-Wide Workflow (Days 5–8)

### Daily Feature Branch Flow
```bash
git switch main
git pull origin main
git switch -c feat/task-routes
# ... code & commit ...
git add -p
git commit -m "feat: add task CRUD routes"
git push -u origin feat/task-routes
```
Open PR on GitHub → include `Closes #<issue-number>` in description → pass CI → get 1 peer approval → **Squash & Merge**.

### Updating Your Branch When `main` Moves
```bash
git fetch origin
git rebase origin/main        # Or: git merge origin/main
# Fix conflicts if any, then:
git add .
git rebase --continue         # Or: git commit (if merging)
git push --force-with-lease   # Only needed after rebase
```

### Resolving `package-lock.json` Conflicts
Never edit `package-lock.json` by hand!
1. Resolve conflicts in `package.json` first.
2. Run `npm install` — npm automatically regenerates a clean `package-lock.json`.
3. `git add package.json package-lock.json && git commit`.
