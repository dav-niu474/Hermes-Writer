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
 * Supabase client implementation (Prisma-compatible API)
 * Uses Supabase JS SDK for reliable serverless database access
 */
function createSupabaseDb(supabase: any) {
  function toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }
  function rowToCamel(row: Record<string, any>): Record<string, any> {
    const r: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) r[toCamelCase(k)] = v;
    return r;
  }
  function dataToSnake(data: Record<string, any>): Record<string, any> {
    const r: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      r[k === "id" ? "id" : toSnakeCase(k)] = v;
    }
    return r;
  }
  function whereToSnake(where: Record<string, any>): Record<string, any> {
    const r: Record<string, any> = {};
    for (const [k, v] of Object.entries(where)) r[toSnakeCase(k)] = v;
    return r;
  }

  const tableNames = {
    user: "user", novel: "novel", chapter: "chapter", character: "character",
    worldSetting: "world_setting", agentTask: "agent_task", novelSpec: "novel_spec",
    specDelta: "spec_delta", changeProposal: "change_proposal",
    chapterSnapshot: "chapter_snapshot", branch: "branch",
  };

  async function resolveIncludes(tableName: string, rows: Record<string, any>[], include: Record<string, any>) {
    if (!include || Object.keys(include).length === 0 || rows.length === 0) return rows;
    const tableMap: Record<string, string> = {
      chapters: "chapter", characters: "character", worldSettings: "world_setting",
      agentTasks: "agent_task", specs: "novel_spec", changeProposals: "change_proposal",
      snapshots: "chapter_snapshot", branches: "branch", specDeltas: "spec_delta",
      novel: "novel", chapter: "chapter", proposal: "change_proposal", spec: "novel_spec",
    };
    const fkBase = tableName.charAt(0).toLowerCase() + tableName.slice(1) + "Id";

    for (const [relKey, relOpts] of Object.entries(include)) {
      const tgt = tableMap[relKey] || relKey;
      if (relOpts && typeof relOpts === "object" && relOpts._count) {
        const cKeys = Object.keys(relOpts._count.select || {});
        for (const row of rows) {
          if (cKeys.length > 0) {
            const counts: Record<string, number> = {};
            for (const ck of cKeys) {
              const ct = tableMap[ck] || ck;
              const cfk = tableName.charAt(0).toLowerCase() + tableName.slice(1) + "Id";
              const { count } = await supabase.from(ct).select("*", { count: "exact", head: true }).eq(toSnakeCase(cfk), row.id);
              counts[ck] = count || 0;
            }
            row._count = counts;
          } else {
            const { count } = await supabase.from(tgt).select("*", { count: "exact", head: true }).eq(toSnakeCase(fkBase), row.id);
            row._count = count || 0;
          }
        }
        continue;
      }
      if (["novel", "chapter", "spec", "proposal"].includes(relKey)) {
        const fk = relKey + "Id";
        for (const row of rows) {
          const fv = row[fk];
          if (fv) {
            const { data } = await supabase.from(tgt).select("*").eq("id", fv).single();
            row[relKey] = data ? rowToCamel(data) : null;
          } else row[relKey] = null;
        }
      } else {
        for (const row of rows) {
          let q = supabase.from(tgt).select("*").eq(toSnakeCase(fkBase), row.id);
          if (relOpts?.orderBy) { const f = Object.keys(relOpts.orderBy)[0]; q = q.order(toSnakeCase(f), { ascending: String(Object.values(relOpts.orderBy)[0]) === "asc" }); }
          if (relOpts?.take) q = q.limit(relOpts.take);
          const { data } = await q;
          row[relKey] = (data || []).map(rowToCamel);
        }
      }
    }
    return rows;
  }

  const makeModel = (name: string) => ({
    findMany: async (opts?: any) => {
      try {
        const t = tableNames[name];
        let q = supabase.from(t).select("*");
        if (opts?.where) q = q.match(whereToSnake(opts.where));
        if (opts?.orderBy) { const f = Object.keys(opts.orderBy)[0]; q = q.order(toSnakeCase(f), { ascending: String(Object.values(opts.orderBy)[0]) === "asc" }); }
        if (opts?.take) q = q.limit(opts.take);
        const { data, error } = await q;
        if (error) throw error;
        let rows = (data || []).map(rowToCamel);
        if (opts?.include) rows = await resolveIncludes(name, rows, opts.include);
        return rows;
      } catch (e) { console.error(`[db] ${name}.findMany:`, e); return []; }
    },
    findUnique: async (args?: any) => {
      try {
        const { data, error } = await supabase.from(tableNames[name]).select("*").match(whereToSnake(args?.where || {})).single();
        if (error?.code === "PGRST116") return null;
        if (error) throw error;
        if (!data) return null;
        let row = rowToCamel(data);
        if (args?.include) await resolveIncludes(name, [row], args.include);
        return row;
      } catch (e) { console.error(`[db] ${name}.findUnique:`, e); return null; }
    },
    findFirst: async (args?: any) => {
      try {
        let q = supabase.from(tableNames[name]).select("*");
        if (args?.where) q = q.match(whereToSnake(args.where));
        if (args?.orderBy) { const f = Object.keys(args.orderBy)[0]; q = q.order(toSnakeCase(f), { ascending: String(Object.values(args.orderBy)[0]) === "asc" }); }
        q = q.limit(1);
        const { data, error } = await q;
        if (error) throw error;
        if (!data?.length) return null;
        let row = rowToCamel(data[0]);
        if (args?.include) await resolveIncludes(name, [row], args.include);
        return row;
      } catch (e) { console.error(`[db] ${name}.findFirst:`, e); return null; }
    },
    create: async (args: { data: any }) => {
      try {
        const now = new Date().toISOString();
        const enrichedData = { id: args.data.id || crypto.randomUUID(), createdAt: now, updatedAt: now, ...args.data };
        const insertData = dataToSnake(enrichedData);
        // Remove undefined values
        for (const k of Object.keys(insertData)) {
          if (insertData[k] === undefined) delete insertData[k];
        }
        const { data, error } = await supabase.from(tableNames[name]).insert(insertData).select("*").single();
        if (error) throw error;
        return rowToCamel(data);
      } catch (e) { console.error(`[db] ${name}.create:`, e); return { id: args.data.id || randomUUID(), ...args.data, _dbError: (e as Error).message }; }
    },
    update: async (args?: any) => {
      try {
        const { data, error } = await supabase.from(tableNames[name]).update(dataToSnake(args?.data || {})).match(whereToSnake(args?.where || {})).select("*").single();
        if (error) throw error;
        return rowToCamel(data);
      } catch (e) { console.error(`[db] ${name}.update:`, e); return null; }
    },
    delete: async (args?: any) => {
      try {
        const { data, error } = await supabase.from(tableNames[name]).delete().match(whereToSnake(args?.where || {})).select("*").single();
        if (error) throw error;
        return rowToCamel(data);
      } catch (e) { console.error(`[db] ${name}.delete:`, e); return null; }
    },
    count: async (opts?: any) => {
      try {
        let q = supabase.from(tableNames[name]).select("*", { count: "exact", head: true });
        if (opts?.where) q = q.match(whereToSnake(opts.where));
        const { count, error } = await q;
        if (error) throw error;
        return count || 0;
      } catch (e) { console.error(`[db] ${name}.count:`, e); return 0; }
    },
    upsert: async (args: any) => ({ id: args.where?.id, ...args.create }),
  });

  return {
    user: makeModel("user"), novel: makeModel("novel"), chapter: makeModel("chapter"),
    character: makeModel("character"), worldSetting: makeModel("worldSetting"),
    agentTask: makeModel("agentTask"), novelSpec: makeModel("novelSpec"),
    specDelta: makeModel("specDelta"), changeProposal: makeModel("changeProposal"),
    chapterSnapshot: makeModel("chapterSnapshot"), branch: makeModel("branch"),
    $queryRaw: async () => null, $executeRawUnsafe: async () => 0,
    $connect: async () => {}, $disconnect: async () => {},
  };
}

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
          if (typeof relOpts === "object" && relOpts !== null && !(relOpts as any).orderBy && !(relOpts as any).take && !(relOpts as any)._count) {
            const nestedIncludes: Record<string, any> = {};
            for (const [k, v] of Object.entries(relOpts)) {
              if (v && typeof v === "object" && !(v as any).orderBy && !(v as any).take) {
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

        // Build INSERT with only non-null columns (let DB DEFAULT handle rest)
        const insertCols: string[] = [];
        const insertVals: string[] = [];
        for (const col of colNames) {
          const val = allData[col];
          if (val === undefined) continue; // Skip undefined → use DB default
          insertCols.push(`"${col}"`);
          if (val === null) {
            insertVals.push('NULL');
          } else if (typeof val === 'string') {
            insertVals.push(`'${val.replace(/'/g, "''")}'`);
          } else {
            insertVals.push(String(val));
          }
        }

        const result = await pool.query(
          `INSERT INTO "${tableName}" (${insertCols.join(", ")}) VALUES (${insertVals.join(", ")}) RETURNING *`
        );

        if (result.rows.length > 0) {
          return rowToCamel(result.rows[0]);
        }
        return { id, ...data, createdAt: now, updatedAt: now };
      } catch (err) {
        console.error(`[db] create error on ${tableName}:`, (err as Error).message);
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
  `CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "user" ADD CONSTRAINT "user_email_key" UNIQUE ("email"); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "novel" (
    "id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '', "cover_image" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft', "word_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "novel_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "chapter" (
    "id" TEXT NOT NULL, "novel_id" TEXT NOT NULL, "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '', "summary" TEXT NOT NULL DEFAULT '',
    "chapter_number" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'draft',
    "word_count" INTEGER NOT NULL DEFAULT 0, "branch_id" TEXT NOT NULL DEFAULT 'main',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chapter_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "chapter" ADD CONSTRAINT "chapter_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "character" (
    "id" TEXT NOT NULL, "novel_id" TEXT NOT NULL, "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'supporting', "description" TEXT NOT NULL DEFAULT '',
    "personality" TEXT NOT NULL DEFAULT '', "appearance" TEXT NOT NULL DEFAULT '',
    "backstory" TEXT NOT NULL DEFAULT '', "avatar_url" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "character_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "character" ADD CONSTRAINT "character_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "world_setting" (
    "id" TEXT NOT NULL, "novel_id" TEXT NOT NULL, "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'geography', "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "world_setting_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "world_setting" ADD CONSTRAINT "world_setting_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "agent_task" (
    "id" TEXT NOT NULL, "novel_id" TEXT NOT NULL, "chapter_id" TEXT,
    "agent_type" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
    "input" TEXT NOT NULL DEFAULT '', "output" TEXT NOT NULL DEFAULT '',
    "error_message" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_task_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "agent_task" ADD CONSTRAINT "agent_task_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "agent_task" ADD CONSTRAINT "agent_task_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "change_proposal" (
    "id" TEXT NOT NULL, "novel_id" TEXT NOT NULL, "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '', "scope" TEXT NOT NULL DEFAULT '',
    "impact" TEXT NOT NULL DEFAULT '', "tasks" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft', "completed_at" TIMESTAMP(3), "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "change_proposal_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "change_proposal" ADD CONSTRAINT "change_proposal_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "novel_spec" (
    "id" TEXT NOT NULL, "novel_id" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'outline',
    "title" TEXT NOT NULL, "content" TEXT NOT NULL DEFAULT '', "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active', "parent_spec_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "novel_spec_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "novel_spec" ADD CONSTRAINT "novel_spec_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "spec_delta" (
    "id" TEXT NOT NULL, "spec_id" TEXT NOT NULL, "proposal_id" TEXT,
    "operation" TEXT NOT NULL DEFAULT 'ADDED', "description" TEXT NOT NULL DEFAULT '',
    "diff_content" TEXT NOT NULL DEFAULT '', "applied" BOOLEAN NOT NULL DEFAULT false,
    "applied_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "spec_delta_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "spec_delta" ADD CONSTRAINT "spec_delta_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "novel_spec"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "spec_delta" ADD CONSTRAINT "spec_delta_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "change_proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "chapter_snapshot" (
    "id" TEXT NOT NULL, "novel_id" TEXT NOT NULL, "chapter_id" TEXT,
    "chapter_number" INTEGER NOT NULL DEFAULT 0, "snapshot_type" TEXT NOT NULL DEFAULT 'manual',
    "label" TEXT NOT NULL DEFAULT '', "chapter_content" TEXT NOT NULL DEFAULT '',
    "spec_snapshot" TEXT NOT NULL DEFAULT '', "metadata" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chapter_snapshot_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "chapter_snapshot" ADD CONSTRAINT "chapter_snapshot_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "branch" (
    "id" TEXT NOT NULL, "novel_id" TEXT NOT NULL, "name" TEXT NOT NULL DEFAULT 'main',
    "description" TEXT NOT NULL DEFAULT '', "parent_branch_id" TEXT, "based_on_snapshot_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "branch_pkey" PRIMARY KEY ("id")
  )`,
  `DO $$ BEGIN ALTER TABLE "branch" ADD CONSTRAINT "branch_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE INDEX IF NOT EXISTS "chapter_novel_id_idx" ON "chapter"("novel_id")`,
  `CREATE INDEX IF NOT EXISTS "character_novel_id_idx" ON "character"("novel_id")`,
  `CREATE INDEX IF NOT EXISTS "world_setting_novel_id_idx" ON "world_setting"("novel_id")`,
  `CREATE INDEX IF NOT EXISTS "agent_task_novel_id_idx" ON "agent_task"("novel_id")`,
  `CREATE INDEX IF NOT EXISTS "novel_spec_novel_id_idx" ON "novel_spec"("novel_id")`,
  `CREATE INDEX IF NOT EXISTS "change_proposal_novel_id_idx" ON "change_proposal"("novel_id")`,
  `CREATE INDEX IF NOT EXISTS "chapter_snapshot_novel_id_idx" ON "chapter_snapshot"("novel_id")`,
  `CREATE INDEX IF NOT EXISTS "branch_novel_id_idx" ON "branch"("novel_id")`,
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

  // Try PostgreSQL (via Supabase JS client for reliable serverless connection)
  if (isPostgresAvailable) {
    try {
      const { createClient } = await import("@supabase/supabase-js");

      // Use the Supabase URL and anon key for client-side compatible access,
      // or service role key for admin access (bypasses RLS)
      const supabaseUrl = process.env.NEXT_PUBLIC_hermersWriter_SUPABASE_URL
        || process.env.hermersWriter_SUPABASE_URL
        || "";
      const supabaseKey = process.env.hermersWriter_SUPABASE_SERVICE_ROLE_KEY
        || process.env.hermersWriter_SUPABASE_ANON_KEY
        || "";

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase URL or key");
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Test connection
      const { error: testError } = await supabase.from("novel").select("id").limit(1);
      // If table doesn't exist, we need to create it
      if (testError && testError.message?.includes("Could not find the table")) {
        console.log("[db] Tables don't exist, creating via Neon Pool...");
        const { Pool } = await import("@neondatabase/serverless");
        if (typeof globalThis.WebSocket === "undefined") {
          try { const ws = await import("ws"); (globalThis as any).WebSocket = ws.default || ws; } catch { /* */ }
        }
        const ddlUrl = process.env.hermersWriter_POSTGRES_URL_NON_POOLING
          || process.env.hermersWriter_POSTGRES_PRISMA_URL
          || getPostgresUrl()!;
        try {
          const ddlPool = new Pool({ connectionString: ddlUrl, max: 1 });
          await ensureSchema(ddlPool);
          console.log("[db] Schema created successfully via Neon Pool");
        } catch (ddlErr) {
          console.error("[db] Schema creation failed:", (ddlErr as Error).message?.slice(0, 200));
        }
      } else if (testError) {
        throw new Error(`Supabase test failed: ${testError.message}`);
      }

      const pgDb = createSupabaseDb(supabase);
      _dbInitialized = true;
      console.log("[db] Supabase client connected");
      return pgDb;
    } catch (err) {
      const errMsg = (err as Error).message?.slice(0, 200) || "Unknown error";
      console.error("[db] PostgreSQL init failed:", errMsg);
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
