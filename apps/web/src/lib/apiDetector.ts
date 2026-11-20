export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface DetectedApiEndpoint {
  method: HttpMethod;
  path: string;
  sourceFile: string;
  pathParams: string[];
  sampleBody?: string;
}

const CODE_FILE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;

function extractPathParams(routePath: string): string[] {
  const params: string[] = [];
  const re = /:([a-zA-Z0-9_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(routePath)) !== null) {
    if (!params.includes(m[1])) {
      params.push(m[1]);
    }
  }
  return params;
}

function normalizeJoinedPath(prefix: string, subPath: string): string {
  const cleanPrefix = prefix.replace(/\/+$/, "");
  const cleanSub = subPath.startsWith("/") ? subPath : `/${subPath}`;
  if (!cleanPrefix || cleanPrefix === "/") return cleanSub;
  if (cleanSub === "/") return cleanPrefix;
  return `${cleanPrefix}${cleanSub}`;
}

function inferSampleBody(
  fileContent: string,
  matchIndex: number,
  method: HttpMethod
): string | undefined {
  if (method === "GET" || method === "HEAD" || method === "DELETE" || method === "OPTIONS") {
    return undefined;
  }

  // Inspect the next ~600 characters of the route handler for req.body destructuring or property access
  const snippet = fileContent.slice(matchIndex, matchIndex + 700);
  const fields = new Set<string>();

  const destructureRe = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*(?:req\.body|await\s+(?:req|c\.req)\.json\(\))/g;
  let dm: RegExpExecArray | null;
  while ((dm = destructureRe.exec(snippet)) !== null) {
    for (const part of dm[1].split(",")) {
      const cleaned = part.trim().split(/[:=]/)[0]?.trim();
      if (cleaned && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(cleaned)) {
        fields.add(cleaned);
      }
    }
  }

  const propRe = /req\.body\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let pm: RegExpExecArray | null;
  while ((pm = propRe.exec(snippet)) !== null) {
    fields.add(pm[1]);
  }

  if (fields.size === 0) return undefined;

  const sample: Record<string, unknown> = {};
  for (const field of fields) {
    const lower = field.toLowerCase();
    if (lower.includes("email")) sample[field] = "student@example.com";
    else if (lower.includes("password")) sample[field] = "secret123";
    else if (lower.includes("done") || lower.includes("completed") || lower.startsWith("is")) {
      sample[field] = false;
    } else if (lower.includes("count") || lower.includes("age") || lower.includes("price") || lower.includes("amount")) {
      sample[field] = 1;
    } else {
      sample[field] = "";
    }
  }

  return JSON.stringify(sample, null, 2);
}

/**
 * Scans project source files for Express / Fastify / Hono / Koa route definitions
 * such as `app.get('/api/users', ...)` or `router.post("/tasks", ...)`,
 * including mounted router prefixes (e.g. `app.use('/api/tasks', tasksRouter)`),
 * path parameters (`:id`), and inferred sample JSON bodies from `req.body`.
 */
export function detectApiEndpoints(
  files: Array<{ path: string; content: string }>
): DetectedApiEndpoint[] {
  const found: DetectedApiEndpoint[] = [];
  const seen = new Set<string>();

  // 1. Collect router mount prefixes like app.use("/api/todos", todosRouter)
  const mountedPrefixesByFileHint = new Map<string, string>();
  const globalPrefixes: string[] = [];

  for (const file of files) {
    if (!CODE_FILE_RE.test(file.path)) continue;

    // Map imported identifier -> file basename hint
    const importHints = new Map<string, string>();
    const importRe =
      /import\s+(?:\{\s*([^}]+)\s*\}|([a-zA-Z0-9_$]+))\s+from\s+['"`]([^'"`]+)['"`]/g;
    let im: RegExpExecArray | null;
    while ((im = importRe.exec(file.content)) !== null) {
      const target = im[3].split("/").pop()?.replace(/\.(js|ts|mjs|cjs)$/, "") ?? "";
      if (im[2]) {
        importHints.set(im[2], target.toLowerCase());
      } else if (im[1]) {
        for (const spec of im[1].split(",")) {
          const name = spec.trim().split(/\s+as\s+/).pop()?.trim();
          if (name) importHints.set(name, target.toLowerCase());
        }
      }
    }

    const useRe =
      /\b(?:app|server|api)\.(?:use|route)\s*\(\s*(['"`])(\/[^'"`]*)\1\s*,\s*([a-zA-Z0-9_$]+)/g;
    let um: RegExpExecArray | null;
    while ((um = useRe.exec(file.content)) !== null) {
      const prefix = um[2].trim();
      const routerIdent = um[3];
      const fileHint = importHints.get(routerIdent) || routerIdent.toLowerCase();
      mountedPrefixesByFileHint.set(fileHint, prefix);
      if (!globalPrefixes.includes(prefix)) {
        globalPrefixes.push(prefix);
      }
    }
  }

  const routeRegex =
    /\b(app|router|server|api|fastify|hono)\.(get|post|put|patch|delete|head|options)\s*\(\s*(['"`])(\/[^'"`]*)\3/gi;

  for (const file of files) {
    if (!CODE_FILE_RE.test(file.path)) continue;
    const baseName =
      file.path
        .split("/")
        .pop()
        ?.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, "")
        .toLowerCase() ?? "";

    let match: RegExpExecArray | null;
    while ((match = routeRegex.exec(file.content)) !== null) {
      const targetObj = match[1].toLowerCase();
      const method = match[2].toUpperCase() as HttpMethod;
      let routePath = match[4].trim() || "/";

      // Apply mounted prefix if this is a router file
      if (targetObj === "router") {
        const matchedPrefix =
          mountedPrefixesByFileHint.get(baseName) ||
          Array.from(mountedPrefixesByFileHint.entries()).find(
            ([hint]) =>
              baseName.includes(hint) || hint.includes(baseName)
          )?.[1];
        if (matchedPrefix && !routePath.startsWith(matchedPrefix)) {
          routePath = normalizeJoinedPath(matchedPrefix, routePath);
        }
      }

      const key = `${method} ${routePath}`;
      if (!seen.has(key)) {
        seen.add(key);
        found.push({
          method,
          path: routePath,
          sourceFile: file.path,
          pathParams: extractPathParams(routePath),
          sampleBody: inferSampleBody(file.content, match.index, method),
        });
      }
    }
  }

  const methodOrder: Record<HttpMethod, number> = {
    GET: 0,
    POST: 1,
    PUT: 2,
    PATCH: 3,
    DELETE: 4,
    HEAD: 5,
    OPTIONS: 6,
  };

  found.sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return methodOrder[a.method] - methodOrder[b.method];
  });

  return found.slice(0, 32);
}

/**
 * Heuristically determines if a project is primarily a backend API server
 * (Express, Fastify, Hono, Koa, or Node http.createServer) without a frontend HTML entry.
 */
export function isLikelyApiProject(
  files: Array<{ path: string; content: string }>
): boolean {
  const hasHtmlEntry = files.some(
    (f) => f.path === "index.html" || f.path === "public/index.html"
  );

  const pkgFile = files.find((f) => f.path === "package.json");
  let hasApiDep = false;
  let hasFrontendDep = false;

  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const allDeps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
      };
      const apiLibs = [
        "express",
        "fastify",
        "hono",
        "koa",
        "@hapi/hapi",
        "restify",
      ];
      const uiLibs = [
        "vite",
        "react",
        "vue",
        "svelte",
        "next",
        "astro",
        "@angular/core",
      ];
      hasApiDep = apiLibs.some((lib) => lib in allDeps);
      hasFrontendDep = uiLibs.some((lib) => lib in allDeps);
    } catch {
      // Ignore malformed package.json
    }
  }

  if (hasFrontendDep || hasHtmlEntry) {
    return false;
  }

  if (hasApiDep) {
    return true;
  }

  const detected = detectApiEndpoints(files);
  if (detected.length > 0) {
    return true;
  }

  return files.some(
    (f) =>
      CODE_FILE_RE.test(f.path) &&
      /\bcreateServer\s*\(/.test(f.content) &&
      /application\/json|res\.json|JSON\.stringify/.test(f.content)
  );
}
