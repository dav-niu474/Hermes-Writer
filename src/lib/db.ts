/**
 * Database module
 *
 * Strategy:
 * - Vercel prod: @neondatabase/serverless Pool → raw SQL with Prisma-compatible API
 * - Local dev: better-sqlite3 (via db-sqlite.ts)
 * - Fallback: no-op stub (app never crashes)
 */

import { randomUUID } from "crypto";

// ============================================================
// Environment detection
// ============================================================

function isPostgresUrl(url: string): boolean {
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

function getPostgresUrl(): string | null {
  // Prefer non-pooling URL for read-after-write consistency on Neon/Supabase
  if (process.env.hermersWriter_POSTGRES_URL_NON_POOLING) return process.env.hermersWriter_POSTGRES_URL_NON_POOLING;
  if (process.env.POSTGRES_URL_NON_POOLING) return process.env.POSTGRES_URL_NON_POOLING;
  if (process.env.hermersWriter_POSTGRES_PRISMA_URL) return process.env.hermersWriter_POSTGRES_PRISMA_URL;
  if (process.env.POSTGRES_PRISMA_URL) return process.env.POSTGRES_PRISMA_URL;
  if (process.env.DATABASE_URL && isPostgresUrl(process.env.DATABASE_URL) && !process.env.DATABASE_URL.includes("dummy")) {
    return process.env.DATABASE_URL;
  }
  return null;
}

export const isPostgresAvailable = !!getPostgresUrl();

// ============================================================
// No-op stub database
// ============================================================

function createNoopDb() {
  const noopModel = {
    findMany: async (_opts?: any) => [],
    findUnique: async (_args?: any) => null,
    findFirst: async (_args?: any) => null,
    create: async (args: { data: any }) => ({ id: args.data?.id || randomUUID(), ...args.data }),
    update: async (_args?: any) => null,
    delete: async (_args?: any) => null,
    count: async (_opts?: any) => 0,
    upsert: async (args: any) => ({
      id: args.where?.id || randomUUID(),
      ...args.create,
    }),
  };

  const db: Record<string, any> = {
    user: noopModel,
    novel: noopModel,
    chapter: noopModel,
    character: noopModel,
    worldSetting: noopModel,
    agentTask: noopModel,
    novelSpec: noopModel,
    specDelta: noopModel,
    changeProposal: noopModel,
    chapterSnapshot: noopModel,
    branch: noopModel,
    $queryRaw: async () => null,
    $executeRawUnsafe: async () => 0,
    $connect: async () => {},
    $disconnect: async () => {},
  };

  return db;
}

// ============================================================
// PostgreSQL implementation via Neon Pool
// ============================================================

type SqlExecutor = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
};

/**
 * Build a Prisma-compatible model proxy for a given table using raw SQL
 */
function createPgModel(pool: SqlExecutor, tableName: string) {
  // Mapping from camelCase model names to snake_case column names
  const columnMap: Record<string, Record<string, string>> = {
    Novel: { id: "id", title: "title", description: "description", genre: "genre", coverImage: "coverImage", status: "status", wordCount: "wordCount", createdAt: "createdAt", updatedAt: "updatedAt" },
    Chapter: { id: "id", novelId: "novelId", title: "title", content: "content", summary: "summary", chapterNumber: "chapterNumber", status: "status", wordCount: "wordCount", branchId: "branchId", createdAt: "createdAt", updatedAt: "updatedAt" },
    Character: { id: "id", novelId: "novelId", name: "name", role: "role", description: "description", personality: "personality", appearance: "appearance", backstory: "backstory", avatarUrl: "avatarUrl", createdAt: "createdAt", updatedAt: "updatedAt" },
    WorldSetting: { id: "id", novelId: "novelId", name: "name", category: "category", description: "description", createdAt: "createdAt", updatedAt: "updatedAt" },
    AgentTask: { id: "id", novelId: "novelId", chapterId: "chapterId", agentType: "agentType", status: "status", input: "input", output: "output", errorMessage: "errorMessage", createdAt: "createdAt", updatedAt: "updatedAt" },
    NovelSpec: { id: "id", novelId: "novelId", category: "category", title: "title", content: "content", version: "version", status: "status", parentSpecId: "parentSpecId", createdAt: "createdAt", updatedAt: "updatedAt" },
    SpecDelta: { id: "id", specId: "specId", proposalId: "proposalId", operation: "operation", description: "description", diffContent: "diffContent", applied: "applied", appliedAt: "appliedAt", createdAt: "createdAt" },
    ChangeProposal: { id: "id", novelId: "novelId", title: "title", description: "description", scope: "scope", impact: "impact", tasks: "tasks", status: "status", completedAt: "completedAt", archivedAt: "archivedAt", createdAt: "createdAt", updatedAt: "updatedAt" },
    ChapterSnapshot: { id: "id", novelId: "novelId", chapterId: "chapterId", chapterNumber: "chapterNumber", snapshotType: "snapshotType", label: "label", chapterContent: "chapterContent", specSnapshot: "specSnapshot", metadata: "metadata", createdAt: "createdAt" },
    Branch: { id: "id", novelId: "novelId", name: "name", description: "description", parentBranchId: "parentBranchId", basedOnSnapshotId: "basedOnSnapshotId", status: "status", createdAt: "createdAt", updatedAt: "updatedAt" },
    User: { id: "id", email: "email", name: "name", createdAt: "createdAt", updatedAt: "updatedAt" },
  };

  const cols = columnMap[tableName] || {};
  const colNames = Object.keys(cols);
  const colList = colNames.map(c => `"${c}"`).join(", ");
  const paramList = colNames.map((_, i) => `$${i + 1}`).join(", ");

  function snakeToCamel(snake: string): string {
    return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  function rowToCamel(row: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      result[snakeToCamel(key)] = val;
    }
    return result;
  }

  function rowsToCamel(rows: Record<string, any>[]): Record<string, any>[] {
    return rows.map(rowToCamel);
  }

  function getValues(data: Record<string, any>, columns: string[]): any[] {
    return columns.map((col) => {
      const val = data[col];
      if (val === undefined) return null;
      if (val instanceof Date) return val.toISOString();
      return val;
    });
  }

  async function resolveIncludes(
    rows: Record<string, any>[],
    include: Record<string, any>
  ): Promise<Record<string, any>[]> {
    if (!include || Object.keys(include).length === 0) return rows;

    for (const [relKey, relOpts] of Object.entries(include)) {
      const camelTable = relKey.charAt(0).toUpperCase() + relKey.slice(1);
      // Map relation key to actual table name
      const tableMapping: Record<string, string> = {
        chapters: "Chapter", characters: "Character", worldSettings: "WorldSetting",
        agentTasks: "AgentTask", specs: "NovelSpec", changeProposals: "ChangeProposal",
        snapshots: "ChapterSnapshot", branches: "Branch", specDeltas: "SpecDelta",
        proposal: "ChangeProposal", spec: "NovelSpec", novel: "Novel", chapter: "Chapter",
      };
      const actualTable = tableMapping[relKey] || camelTable;
      const relModel = createPgModel(pool, actualTable);

      // Check for _count
      if (relOpts && typeof relOpts === "object" && relOpts._count) {
        const countSelect = relOpts._count.select || {};
        const countKeys = Object.keys(countSelect);
        // FK column on child table: e.g., "Novel" → "novelId"
        const parentFk = tableName.charAt(0).toLowerCase() + tableName.slice(1) + "Id";
        if (countKeys.length > 0) {
          // Nested count: count chapters, characters, etc per parent row
          for (const row of rows) {
            const counts: Record<string, number> = {};
            for (const countKey of countKeys) {
              const countTable = tableMapping[countKey] || countKey;
              const countResult = await pool.query(
                `SELECT COUNT(*)::int as cnt FROM "${countTable}" WHERE "${parentFk}" = $1`,
                [row.id]
              );
              counts[countKey] = countResult.rows[0]?.cnt || 0;
            }
            row._count = counts;
          }
        } else {
          for (const row of rows) {
            const result = await pool.query(
              `SELECT COUNT(*)::int as cnt FROM "${actualTable}" WHERE "${parentFk}" = $1`,
              [row.id]
            );
            row._count = result.rows[0]?.cnt || 0;
          }
        }
        continue;
      }

      // Regular include: load related records
      for (const row of rows) {
        if (relKey === "novel") {
          // BelongsTo: use the foreign key on this row
          const fkVal = row.novelId;
          if (fkVal) {
            const relRows = await pool.query(`SELECT * FROM "Novel" WHERE "id" = $1`, [fkVal]);
            row.novel = relRows.rows.length > 0 ? rowToCamel(relRows.rows[0]) : null;
          } else {
            row.novel = null;
          }
        } else if (relKey === "chapter") {
          const fkVal = row.chapterId;
          if (fkVal) {
            const relRows = await pool.query(`SELECT * FROM "Chapter" WHERE "id" = $1`, [fkVal]);
            row.chapter = relRows.rows.length > 0 ? rowToCamel(relRows.rows[0]) : null;
          } else {
            row.chapter = null;
          }
        } else if (relKey === "spec") {
          const fkVal = row.specId;
          if (fkVal) {
            const relRows = await pool.query(`SELECT * FROM "NovelSpec" WHERE "id" = $1`, [fkVal]);
            row.spec = relRows.rows.length > 0 ? rowToCamel(relRows.rows[0]) : null;
          } else {
            row.spec = null;
          }
        } else if (relKey === "proposal") {
          const fkVal = row.proposalId;
          if (fkVal) {
            const relRows = await pool.query(`SELECT * FROM "ChangeProposal" WHERE "id" = $1`, [fkVal]);
            row.proposal = relRows.rows.length > 0 ? rowToCamel(relRows.rows[0]) : null;
          } else {
            row.proposal = null;
          }
        } else {
          // HasMany: use parent's id to find children
          const fkCol = tableName.charAt(0).toLowerCase() + tableName.slice(1) + "Id"; // e.g., "Novel" → "novelId"
          let relRows;
          if (typeof relOpts === "object" && relOpts !== null) {
            let query = `SELECT * FROM "${actualTable}" WHERE "${fkCol}" = $1`;
            const params: any[] = [row.id];
            if (relOpts.orderBy) {
              const orderField = relOpts.orderBy.createdAt ? "createdAt" : Object.keys(relOpts.orderBy)[0];
              const orderDir = Object.values(relOpts.orderBy)[0] as string;
              query += ` ORDER BY "${orderField}" ${orderDir.toUpperCase()}`;
            }
            if (relOpts.take) {
              query += ` LIMIT $${params.length + 1}`;
              params.push(relOpts.take);
            }
            relRows = await pool.query(query, params);
          } else {
            relRows = await pool.query(
              `SELECT * FROM "${actualTable}" WHERE "${fkCol}" = $1`,
              [row.id]
            );
          }
          const relData = rowsToCamel(relRows.rows);
          row[relKey] = relData;

          // Recursively resolve nested includes
          if (typeof relOpts === "object" && relOpts !== null && !relOpts.orderBy && !relOpts.take && !relOpts._count) {
            const nestedIncludes: Record<string, any> = {};
            for (const [k, v] of Object.entries(relOpts)) {
              if (v && typeof v === "object" && !v.orderBy && !v.take) {
                nestedIncludes[k] = v;
              }
            }
            if (Object.keys(nestedIncludes).length > 0) {
              await resolveIncludes(relData, nestedIncludes);
            }
          }
        }
      }
    }

    return rows;
  }

  function buildWhereClause(where: Record<string, any>): { sql: string; params: any[] } {
    if (!where || Object.keys(where).length === 0) return { sql: "", params: [] };

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;
      const col = snakeToCamel(key);
      if (value === null || value === undefined) {
        conditions.push(`"${col}" IS NULL`);
      } else {
        conditions.push(`"${col}" = $${paramIdx}`);
        params.push(value instanceof Date ? value.toISOString() : value);
        paramIdx++;
      }
    }

    return {
      sql: conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "",
      params,
    };
  }

  function buildSetClause(data: Record<string, any>): { sql: string; params: any[] } {
    const setParts: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    // Always set updatedAt
    setParts.push(`"updatedAt" = $${paramIdx}`);
    params.push(new Date().toISOString());
    paramIdx++;

    for (const [key, value] of Object.entries(data)) {
      if (key === "id" || key === "createdAt" || key === "updatedAt") continue;
      if (value === undefined) continue;
      const col = snakeToCamel(key);
      setParts.push(`"${col}" = $${paramIdx}`);
      params.push(value instanceof Date ? value.toISOString() : value);
      paramIdx++;
    }

    return {
      sql: setParts.join(", "),
      params,
    };
  }

  return {
    findMany: async (opts?: any) => {
      try {
        let query = `SELECT * FROM "${tableName}"`;
        const params: any[] = [];
        let paramIdx = 1;

        if (opts?.where) {
          const { sql: whereSql, params: whereParams } = buildWhereClause(opts.where);
          query += whereSql;
          params.push(...whereParams);
          paramIdx += whereParams.length;
        }

        if (opts?.orderBy) {
          const field = Object.keys(opts.orderBy)[0];
          const dir = (Object.values(opts.orderBy)[0] as string).toUpperCase();
          query += ` ORDER BY "${field}" ${dir}`;
        }

        if (opts?.take) {
          query += ` LIMIT $${paramIdx}`;
          params.push(opts.take);
        }

        if (opts?.skip) {
          query += ` OFFSET $${paramIdx}`;
          params.push(opts.skip);
        }

        const result = await pool.query(query, params);
        let rows = rowsToCamel(result.rows);

        if (opts?.include) {
          rows = await resolveIncludes(rows, opts.include);
        }

        if (opts?.select) {
          rows = rows.map((row) => {
            const filtered: Record<string, any> = {};
            for (const key of Object.keys(opts.select)) {
              if (row[key] !== undefined) filtered[key] = row[key];
            }
            return filtered;
          });
        }

        return rows;
      } catch (err) {
        console.error(`[db] findMany error on ${tableName}:`, err);
        return [];
      }
    },

    findUnique: async (args?: any) => {
      try {
        if (!args?.where) return null;
        const { sql: whereSql, params } = buildWhereClause(args.where);
        const result = await pool.query(`SELECT * FROM "${tableName}"${whereSql} LIMIT 1`, params);

        if (result.rows.length === 0) return null;
        let row = rowToCamel(result.rows[0]);

        if (args?.include) {
          await resolveIncludes([row], args.include);
        }

        return row;
      } catch (err) {
        console.error(`[db] findUnique error on ${tableName}:`, err);
        return null;
      }
    },

    findFirst: async (args?: any) => {
      try {
        let query = `SELECT * FROM "${tableName}"`;
        const params: any[] = [];
        let paramIdx = 1;

        if (args?.where) {
          const { sql: whereSql, params: whereParams } = buildWhereClause(args.where);
          query += whereSql;
          params.push(...whereParams);
          paramIdx += whereParams.length;
        }

        if (args?.orderBy) {
          const field = Object.keys(args.orderBy)[0];
          const dir = (Object.values(args.orderBy)[0] as string).toUpperCase();
          query += ` ORDER BY "${field}" ${dir}`;
        }

        query += ` LIMIT 1`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) return null;
        let row = rowToCamel(result.rows[0]);

        if (args?.include) {
          await resolveIncludes([row], args.include);
        }

        return row;
      } catch (err) {
        console.error(`[db] findFirst error on ${tableName}:`, err);
        return null;
      }
    },

    create: async (args: { data: any }) => {
      const data = args.data || {};
      try {
        const id = data.id || randomUUID();
        const now = new Date().toISOString();
        const allData = { ...data, id, createdAt: now, updatedAt: now };
        const values = getValues(allData, colNames);

        // Build non-parameterized INSERT for Neon compatibility
        const valueStr = values.map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
          return String(v);
        }).join(", ");

        const result = await pool.query(
          `INSERT INTO "${tableName}" (${colList}) VALUES (${valueStr}) RETURNING *`
        );

        console.log(`[db] create result: rows=${result?.rows?.length}, keys=${result?.rows?.[0] ? Object.keys(result.rows[0]).join(',') : 'none'}`);

        if (result.rows.length > 0) {
          return rowToCamel(result.rows[0]);
        }
        return { id, ...data, createdAt: now, updatedAt: now, _warning: "no rows returned" };
      } catch (err) {
        console.error(`[db] create error on ${tableName}:`, (err as Error).message, (err as Error).stack?.slice(0, 300));
        return { id: data.id || randomUUID(), ...data, _dbError: (err as Error).message };
      }
    },

    update: async (args?: any) => {
      const data = args?.data || {};
      try {
        if (!args?.where) return null;
        const { sql: setSql, params } = buildSetClause(data);
        // Build WHERE clause separately
        const whereParts: string[] = [];
        const whereParams: any[] = [];
        let wIdx = params.length + 1;
        for (const [key, value] of Object.entries(args.where)) {
          if (value !== undefined && value !== null) {
            whereParts.push(`"${snakeToCamel(key)}" = $${wIdx}`);
            whereParams.push(value instanceof Date ? value.toISOString() : value);
            wIdx++;
          }
        }

        const result = await pool.query(
          `UPDATE "${tableName}" SET ${setSql} WHERE ${whereParts.join(" AND ")} RETURNING *`,
          [...params, ...whereParams]
        );

        if (result.rows.length > 0) {
          return rowToCamel(result.rows[0]);
        }
        return null;
      } catch (err) {
        console.error(`[db] update error on ${tableName}:`, err);
        return null;
      }
    },

    delete: async (args?: any) => {
      try {
        if (!args?.where) return null;
        const { sql: whereSql, params } = buildWhereClause(args.where);
        const result = await pool.query(
          `DELETE FROM "${tableName}"${whereSql} RETURNING *`,
          params
        );
        if (result.rows.length > 0) {
          return rowToCamel(result.rows[0]);
        }
        return null;
      } catch (err) {
        console.error(`[db] delete error on ${tableName}:`, err);
        return null;
      }
    },

    count: async (opts?: any) => {
      try {
        let query = `SELECT COUNT(*)::int as cnt FROM "${tableName}"`;
        const params: any[] = [];
        if (opts?.where) {
          const { sql: whereSql, params: whereParams } = buildWhereClause(opts.where);
          query += whereSql;
          params.push(...whereParams);
        }
        const result = await pool.query(query, params);
        return result.rows[0]?.cnt || 0;
      } catch (err) {
        console.error(`[db] count error on ${tableName}:`, err);
        return 0;
      }
    },

    upsert: async (args: any) => {
      try {
        const existing = await pool.query(
          `SELECT * FROM "${tableName}" WHERE "id" = $1`,
          [args.where?.id]
        );
        if (existing.rows.length > 0) {
          const { sql: setSql, params } = buildSetClause(args.update || {});
          const result = await pool.query(
            `UPDATE "${tableName}" SET ${setSql} WHERE "id" = $${params.length + 1} RETURNING *`,
            [...params, args.where?.id]
          );
          return result.rows.length > 0 ? rowToCamel(result.rows[0]) : null;
        } else {
          // Create
          return await pool.query(
            `INSERT INTO "${tableName}" (${colList}) VALUES (${paramList}) RETURNING *`,
            getValues({ ...args.create, id: args.where?.id }, colNames)
          ).then(r => r.rows.length > 0 ? rowToCamel(r.rows[0]) : null);
        }
      } catch (err) {
        console.error(`[db] upsert error on ${tableName}:`, err);
        return { id: args.where?.id, ...args.create };
      }
    },
  };
}

/**
 * Create a full Postgres database instance
 */
function createPgDb(pool: SqlExecutor) {
  return {
    user: createPgModel(pool, "User"),
    novel: createPgModel(pool, "Novel"),
    chapter: createPgModel(pool, "Chapter"),
    character: createPgModel(pool, "Character"),
    worldSetting: createPgModel(pool, "WorldSetting"),
    agentTask: createPgModel(pool, "AgentTask"),
    novelSpec: createPgModel(pool, "NovelSpec"),
    specDelta: createPgModel(pool, "SpecDelta"),
    changeProposal: createPgModel(pool, "ChangeProposal"),
    chapterSnapshot: createPgModel(pool, "ChapterSnapshot"),
    branch: createPgModel(pool, "Branch"),
    $queryRaw: async (template: TemplateStringsArray, ...values: any[]) => {
      const text = template.reduce((acc, part, i) => acc + part + (values[i] !== undefined ? `$${i + 1}` : ""), "");
      const result = await pool.query(text, values.filter(v => v !== undefined));
      return result.rows;
    },
    $executeRawUnsafe: async (sqlStr: string) => {
      await pool.query(sqlStr);
      return 0;
    },
    $executeRaw: async (template: TemplateStringsArray, ...values: any[]) => {
      const text = template.reduce((acc, part, i) => acc + part + (values[i] !== undefined ? `$${i + 1}` : ""), "");
      await pool.query(text, values.filter(v => v !== undefined));
      return 0;
    },
    $connect: async () => {},
    $disconnect: async () => {},
  };
}

// ============================================================
// Schema auto-creation for Postgres
// ============================================================

const SCHEMA_DDL = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email"); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "Novel" (
    "id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '', "coverImage" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft', "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Novel_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Chapter" (
    "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '', "summary" TEXT NOT NULL DEFAULT '',
    "chapterNumber" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'draft',
    "wordCount" INTEGER NOT NULL DEFAULT 0, "branchId" TEXT NOT NULL DEFAULT 'main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "Character" (
    "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'supporting', "description" TEXT NOT NULL DEFAULT '',
    "personality" TEXT NOT NULL DEFAULT '', "appearance" TEXT NOT NULL DEFAULT '',
    "backstory" TEXT NOT NULL DEFAULT '', "avatarUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "Character" ADD CONSTRAINT "Character_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "WorldSetting" (
    "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'geography', "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorldSetting_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "WorldSetting" ADD CONSTRAINT "WorldSetting_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "AgentTask" (
    "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "chapterId" TEXT,
    "agentType" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
    "input" TEXT NOT NULL DEFAULT '', "output" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "ChangeProposal" (
    "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '', "scope" TEXT NOT NULL DEFAULT '',
    "impact" TEXT NOT NULL DEFAULT '', "tasks" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft', "completedAt" TIMESTAMP(3), "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChangeProposal_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "ChangeProposal" ADD CONSTRAINT "ChangeProposal_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "NovelSpec" (
    "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'outline',
    "title" TEXT NOT NULL, "content" TEXT NOT NULL DEFAULT '', "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active', "parentSpecId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NovelSpec_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "NovelSpec" ADD CONSTRAINT "NovelSpec_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "SpecDelta" (
    "id" TEXT NOT NULL, "specId" TEXT NOT NULL, "proposalId" TEXT,
    "operation" TEXT NOT NULL DEFAULT 'ADDED', "description" TEXT NOT NULL DEFAULT '',
    "diffContent" TEXT NOT NULL DEFAULT '', "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpecDelta_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "SpecDelta" ADD CONSTRAINT "SpecDelta_specId_fkey" FOREIGN KEY ("specId") REFERENCES "NovelSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "SpecDelta" ADD CONSTRAINT "SpecDelta_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ChangeProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "ChapterSnapshot" (
    "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "chapterId" TEXT,
    "chapterNumber" INTEGER NOT NULL DEFAULT 0, "snapshotType" TEXT NOT NULL DEFAULT 'manual',
    "label" TEXT NOT NULL DEFAULT '', "chapterContent" TEXT NOT NULL DEFAULT '',
    "specSnapshot" TEXT NOT NULL DEFAULT '', "metadata" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChapterSnapshot_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "ChapterSnapshot" ADD CONSTRAINT "ChapterSnapshot_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "Branch" (
    "id" TEXT NOT NULL, "novelId" TEXT NOT NULL, "name" TEXT NOT NULL DEFAULT 'main',
    "description" TEXT NOT NULL DEFAULT '', "parentBranchId" TEXT, "basedOnSnapshotId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "Branch" ADD CONSTRAINT "Branch_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE INDEX IF NOT EXISTS "Chapter_novelId_idx" ON "Chapter"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "Character_novelId_idx" ON "Character"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "WorldSetting_novelId_idx" ON "WorldSetting"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "AgentTask_novelId_idx" ON "AgentTask"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "NovelSpec_novelId_idx" ON "NovelSpec"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "ChangeProposal_novelId_idx" ON "ChangeProposal"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "ChapterSnapshot_novelId_idx" ON "ChapterSnapshot"("novelId")`,
  `CREATE INDEX IF NOT EXISTS "Branch_novelId_idx" ON "Branch"("novelId")`,
];

async function ensureSchema(pool: SqlExecutor): Promise<void> {
  for (const sql of SCHEMA_DDL) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.warn("[db] DDL warning:", sql.slice(0, 60), (err as Error).message?.slice(0, 120));
    }
  }
  console.log("[db] Schema auto-created/verified");
}

// ============================================================
// Lazy database initialization
// ============================================================

let _dbInitialized = false;
let _initPromise: Promise<void> | null = null;

async function initDatabase(): Promise<any> {
  if (_dbInitialized) return;

  // Try PostgreSQL (via @neondatabase/serverless Pool for Vercel compatibility)
  if (isPostgresAvailable) {
    try {
      const url = getPostgresUrl()!;

      // WebSocket polyfill for Vercel
      if (typeof globalThis.WebSocket === "undefined") {
        try {
          const ws = await import("ws");
          (globalThis as any).WebSocket = ws.default || ws;
        } catch { /* ws may not be available */ }
      }

      const { Pool, neonConfig } = await import("@neondatabase/serverless");
      // Disable prepared statements for better compatibility
      (neonConfig as any).fetchEndpoint = undefined;
      (neonConfig as any).fetchConnectionCache = true;

      const pool = new Pool({ connectionString: url, max: 1 });

      // Test connection
      const testResult = await pool.query("SELECT 1 as test");
      if (!testResult?.rows?.length) {
        throw new Error("Connection test failed: no rows returned");
      }

      // Auto-create schema
      await ensureSchema(pool);

      const pgDb = createPgDb(pool);
      _dbInitialized = true;
      console.log("[db] PostgreSQL (Neon Pool) connected");
      return pgDb;
    } catch (err) {
      const errMsg = (err as Error).message?.slice(0, 200) || "Unknown error";
      console.error("[db] PostgreSQL init failed:", errMsg);
      // Don't fall through - if Postgres env is set, it should work
      throw new Error(`PostgreSQL init failed: ${errMsg}`);
    }
  }

  // Try SQLite for local dev
  try {
    const { createSqliteDb } = await import("./db-sqlite");
    const sqliteDb = createSqliteDb();
    _dbInitialized = true;
    console.log("[db] SQLite connected");
    return sqliteDb;
  } catch (err) {
    console.warn("[db] SQLite unavailable:", (err as Error).message?.slice(0, 80));
  }

  // Fallback to no-op
  _dbInitialized = true;
  console.log("[db] Using no-op stub (data won't persist, AI features work)");
  return null;
}

// ============================================================
// Exported db — starts as no-op, upgrades lazily
// ============================================================

export const db = createNoopDb();

export async function ensureDbInitialized(): Promise<void> {
  if (_dbInitialized) return;
  if (!_initPromise) {
    _initPromise = initDatabase().then((realDb) => {
      if (realDb) {
        Object.assign(db, realDb);
      }
    });
  }
  await _initPromise;
}
