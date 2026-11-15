# Cheat Sheet: TypeScript for Node.js Backends (Day 3+)

### Core Types & `interface` vs `type`
```ts
interface User {
  id: string;
  email: string;
  role: "admin" | "member"; // Union literal
}

type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

### Type Narrowing
```ts
function handle(res: Result<User>) {
  if (!res.ok) {
    return console.error(res.error); // narrowed to { ok: false; error: string }
  }
  console.log(res.data.email);       // narrowed to { ok: true; data: User }
}
```
* Prefer `unknown` over `any` for untyped inputs (`JSON.parse`, `catch (err)`), then narrow with `typeof`, `instanceof`, or Zod.

### Essential Utility Types
| Utility | Meaning | Example |
| :--- | :--- | :--- |
| `Partial<T>` | All fields optional | `Partial<User>` (PATCH body) |
| `Pick<T, K>` | Keep only keys `K` | `Pick<User, "id" \| "email">` |
| `Omit<T, K>` | Drop keys `K` | `Omit<User, "passwordHash">` |
| `Record<K, V>` | Typed dictionary | `Record<string, number>` |

### `tsconfig.json` (Node + ESM)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  }
}
```
* **Dev:** `npx tsx watch src/server.ts`
* **Typecheck:** `npx tsc --noEmit`
* **Build:** `npx tsc` → `node dist/server.js`

### Express `req.user` Declaration Merging (`src/types/express.d.ts`)
```ts
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: "admin" | "member" };
    }
  }
}
export {};
```
