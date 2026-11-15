# Cheat Sheet: PostgreSQL, Drizzle & Auth Security (Days 5–6)

### Local Postgres via Docker Compose
```bash
docker compose up -d          # Start Postgres in background
docker compose logs -f db     # View DB logs
docker compose down -v        # Stop & wipe volumes (fresh reset)
```

### Drizzle ORM Quick Patterns
```ts
// Select with filter
const rows = await db.select().from(tasks).where(eq(tasks.boardId, boardId));

// Insert returning created row
const [created] = await db.insert(tasks).values({ title, boardId }).returning();

// Atomic Transaction
await db.transaction(async (tx) => {
  await tx.update(accounts).set({ balance: sql`${accounts.balance} - ${amt}` }).where(eq(accounts.id, fromId));
  await tx.update(accounts).set({ balance: sql`${accounts.balance} + ${amt}` }).where(eq(accounts.id, toId));
});
```

### Auth & RBAC Middleware
```ts
// Password hashing (argon2)
const hash = await argon2.hash(password);
const valid = await argon2.verify(hash, password);

// JWT sign & verify
const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: "1h" });
const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: "admin" | "member" };
```
* **Middleware order:** `helmet()` → `cors({ origin })` → `rateLimit(...)` → `express.json()` → routes (`requireAuth` → `requireRole("admin")`) → `errorHandler`.
