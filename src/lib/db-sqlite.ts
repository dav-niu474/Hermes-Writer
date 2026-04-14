/**
 * SQLite-based database module using better-sqlite3.
 * Provides a Prisma-compatible API for local development.
 *
 * DB file: /home/z/my-project/db/hermes-writer.db
 */

import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import { dirname } from "path";

// ============================================================
// Table / column definitions (mirrors Prisma schema)
// ============================================================

interface ColumnDef {
  name: string;
  type: "TEXT" | "INTEGER" | "BOOLEAN";
  nullable: boolean;
  default: string | null; // SQL default expression
}

interface TableDef {
  name: string;
  columns: ColumnDef[];
  foreignKeys: string[];
  indexes: string[];
}

const TABLES: TableDef[] = [
  {
    name: "User",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "email", type: "TEXT", nullable: false, default: null },
      { name: "name", type: "TEXT", nullable: true, default: null },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [],
    indexes: [`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`],
  },
  {
    name: "Novel",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "title", type: "TEXT", nullable: false, default: "''" },
      { name: "description", type: "TEXT", nullable: false, default: "''" },
      { name: "genre", type: "TEXT", nullable: false, default: "''" },
      { name: "coverImage", type: "TEXT", nullable: false, default: "''" },
      { name: "status", type: "TEXT", nullable: false, default: "'draft'" },
      { name: "wordCount", type: "INTEGER", nullable: false, default: "0" },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [],
    indexes: [],
  },
  {
    name: "Chapter",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "novelId", type: "TEXT", nullable: false, default: null },
      { name: "title", type: "TEXT", nullable: false, default: "''" },
      { name: "content", type: "TEXT", nullable: false, default: "''" },
      { name: "summary", type: "TEXT", nullable: false, default: "''" },
      { name: "chapterNumber", type: "INTEGER", nullable: false, default: "1" },
      { name: "status", type: "TEXT", nullable: false, default: "'draft'" },
      { name: "wordCount", type: "INTEGER", nullable: false, default: "0" },
      { name: "branchId", type: "TEXT", nullable: false, default: "'main'" },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [
      `FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    indexes: [
      `CREATE INDEX IF NOT EXISTS "Chapter_novelId_idx" ON "Chapter"("novelId")`,
    ],
  },
  {
    name: "Character",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "novelId", type: "TEXT", nullable: false, default: null },
      { name: "name", type: "TEXT", nullable: false, default: null },
      { name: "role", type: "TEXT", nullable: false, default: "'supporting'" },
      { name: "description", type: "TEXT", nullable: false, default: "''" },
      { name: "personality", type: "TEXT", nullable: false, default: "''" },
      { name: "appearance", type: "TEXT", nullable: false, default: "''" },
      { name: "backstory", type: "TEXT", nullable: false, default: "''" },
      { name: "avatarUrl", type: "TEXT", nullable: false, default: "''" },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [
      `FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    indexes: [
      `CREATE INDEX IF NOT EXISTS "Character_novelId_idx" ON "Character"("novelId")`,
    ],
  },
  {
    name: "WorldSetting",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "novelId", type: "TEXT", nullable: false, default: null },
      { name: "name", type: "TEXT", nullable: false, default: null },
      { name: "category", type: "TEXT", nullable: false, default: "'geography'" },
      { name: "description", type: "TEXT", nullable: false, default: "''" },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [
      `FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    indexes: [
      `CREATE INDEX IF NOT EXISTS "WorldSetting_novelId_idx" ON "WorldSetting"("novelId")`,
    ],
  },
  {
    name: "AgentTask",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "novelId", type: "TEXT", nullable: false, default: null },
      { name: "chapterId", type: "TEXT", nullable: true, default: null },
      { name: "agentType", type: "TEXT", nullable: false, default: null },
      { name: "status", type: "TEXT", nullable: false, default: "'pending'" },
      { name: "input", type: "TEXT", nullable: false, default: "''" },
      { name: "output", type: "TEXT", nullable: false, default: "''" },
      { name: "errorMessage", type: "TEXT", nullable: false, default: "''" },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [
      `FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    ],
    indexes: [
      `CREATE INDEX IF NOT EXISTS "AgentTask_novelId_idx" ON "AgentTask"("novelId")`,
    ],
  },
  {
    name: "NovelSpec",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "novelId", type: "TEXT", nullable: false, default: null },
      { name: "category", type: "TEXT", nullable: false, default: "'outline'" },
      { name: "title", type: "TEXT", nullable: false, default: null },
      { name: "content", type: "TEXT", nullable: false, default: "''" },
      { name: "version", type: "INTEGER", nullable: false, default: "1" },
      { name: "status", type: "TEXT", nullable: false, default: "'active'" },
      { name: "parentSpecId", type: "TEXT", nullable: true, default: null },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [
      `FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    indexes: [
      `CREATE INDEX IF NOT EXISTS "NovelSpec_novelId_idx" ON "NovelSpec"("novelId")`,
    ],
  },
  {
    name: "SpecDelta",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "specId", type: "TEXT", nullable: false, default: null },
      { name: "proposalId", type: "TEXT", nullable: true, default: null },
      { name: "operation", type: "TEXT", nullable: false, default: "'ADDED'" },
      { name: "description", type: "TEXT", nullable: false, default: "''" },
      { name: "diffContent", type: "TEXT", nullable: false, default: "''" },
      { name: "applied", type: "BOOLEAN", nullable: false, default: "0" },
      { name: "appliedAt", type: "TEXT", nullable: true, default: null },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [
      `FOREIGN KEY ("specId") REFERENCES "NovelSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `FOREIGN KEY ("proposalId") REFERENCES "ChangeProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    ],
    indexes: [],
  },
  {
    name: "ChangeProposal",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "novelId", type: "TEXT", nullable: false, default: null },
      { name: "title", type: "TEXT", nullable: false, default: null },
      { name: "description", type: "TEXT", nullable: false, default: "''" },
      { name: "scope", type: "TEXT", nullable: false, default: "''" },
      { name: "impact", type: "TEXT", nullable: false, default: "''" },
      { name: "tasks", type: "TEXT", nullable: false, default: "''" },
      { name: "status", type: "TEXT", nullable: false, default: "'draft'" },
      { name: "completedAt", type: "TEXT", nullable: true, default: null },
      { name: "archivedAt", type: "TEXT", nullable: true, default: null },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [
      `FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    indexes: [
      `CREATE INDEX IF NOT EXISTS "ChangeProposal_novelId_idx" ON "ChangeProposal"("novelId")`,
    ],
  },
  {
    name: "ChapterSnapshot",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "novelId", type: "TEXT", nullable: false, default: null },
      { name: "chapterId", type: "TEXT", nullable: true, default: null },
      { name: "chapterNumber", type: "INTEGER", nullable: false, default: "0" },
      { name: "snapshotType", type: "TEXT", nullable: false, default: "'manual'" },
      { name: "label", type: "TEXT", nullable: false, default: "''" },
      { name: "chapterContent", type: "TEXT", nullable: false, default: "''" },
      { name: "specSnapshot", type: "TEXT", nullable: false, default: "''" },
      { name: "metadata", type: "TEXT", nullable: false, default: "''" },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [
      `FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    indexes: [
      `CREATE INDEX IF NOT EXISTS "ChapterSnapshot_novelId_idx" ON "ChapterSnapshot"("novelId")`,
    ],
  },
  {
    name: "Branch",
    columns: [
      { name: "id", type: "TEXT", nullable: false, default: null },
      { name: "novelId", type: "TEXT", nullable: false, default: null },
      { name: "name", type: "TEXT", nullable: false, default: "'main'" },
      { name: "description", type: "TEXT", nullable: false, default: "''" },
      { name: "parentBranchId", type: "TEXT", nullable: true, default: null },
      { name: "basedOnSnapshotId", type: "TEXT", nullable: true, default: null },
      { name: "status", type: "TEXT", nullable: false, default: "'active'" },
      { name: "createdAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "TEXT", nullable: false, default: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [
      `FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ],
    indexes: [
      `CREATE INDEX IF NOT EXISTS "Branch_novelId_idx" ON "Branch"("novelId")`,
    ],
  },
];

// ============================================================
// Relation map: model → { relationName → { targetTable, foreignKey } }
// ============================================================

type RelationEntry = {
  targetTable: string;
  foreignKey: string;
  nullable: boolean;
  reverse?: string;
};

type RelationMap = Record<
  string,
  Record<string, RelationEntry>
>;

const RELATIONS: RelationMap = {
  Novel: {
    chapters: { targetTable: "Chapter", foreignKey: "novelId", nullable: false },
    characters: { targetTable: "Character", foreignKey: "novelId", nullable: false },
    worldSettings: { targetTable: "WorldSetting", foreignKey: "novelId", nullable: false },
    agentTasks: { targetTable: "AgentTask", foreignKey: "novelId", nullable: false },
    specs: { targetTable: "NovelSpec", foreignKey: "novelId", nullable: false },
    changeProposals: { targetTable: "ChangeProposal", foreignKey: "novelId", nullable: false },
    snapshots: { targetTable: "ChapterSnapshot", foreignKey: "novelId", nullable: false },
    branches: { targetTable: "Branch", foreignKey: "novelId", nullable: false },
  },
  Chapter: {
    agentTasks: { targetTable: "AgentTask", foreignKey: "chapterId", nullable: true },
  },
  NovelSpec: {
    specDeltas: { targetTable: "SpecDelta", foreignKey: "specId", nullable: false },
  },
  ChangeProposal: {
    specDeltas: { targetTable: "SpecDelta", foreignKey: "proposalId", nullable: true },
  },
  SpecDelta: {
    spec: { targetTable: "NovelSpec", foreignKey: "id", nullable: false, reverse: "specId" },
    proposal: { targetTable: "ChangeProposal", foreignKey: "id", nullable: true, reverse: "proposalId" },
  },
};

// ============================================================
// Helper types for Prisma-like query options
// ============================================================

type OrderByClause = string | { field: string; direction: "asc" | "desc" };

interface FindOptions {
  where?: Record<string, any>;
  orderBy?: OrderByClause | OrderByClause[];
  include?: Record<string, any>;
  take?: number;
  select?: Record<string, boolean>;
}

interface CreateOptions {
  data: Record<string, any>;
}

interface UpdateOptions {
  where: Record<string, any>;
  data: Record<string, any>;
}

// ============================================================
// SQLite database singleton
// ============================================================

const DB_PATH = "/home/z/my-project/db/hermes-writer.db";

let _sqliteDb: Database.Database | null = null;

function getSqliteDb(): Database.Database {
  if (!_sqliteDb) {
    // Ensure the db directory exists
    mkdirSync(dirname(DB_PATH), { recursive: true });

    _sqliteDb = new Database(DB_PATH);

    // Enable WAL mode for better concurrency and performance
    _sqliteDb.pragma("journal_mode = WAL");
    _sqliteDb.pragma("foreign_keys = ON");

    // Create all tables
    createTables(_sqliteDb);

    console.log("[sqlite] Database opened at:", DB_PATH);
  }
  return _sqliteDb;
}

function createTables(db: Database.Database): void {
  for (const table of TABLES) {
    const colDefs = table.columns
      .map((col) => {
        let def = `"${col.name}" ${col.type === "BOOLEAN" ? "INTEGER" : col.type}`;
        if (!col.nullable) def += " NOT NULL";
        if (col.default !== null) def += ` DEFAULT ${col.default}`;
        return def;
      })
      .join(", ");

    const fkDefs = table.foreignKeys.length > 0 ? ", " + table.foreignKeys.join(", ") : "";

    const sql = `CREATE TABLE IF NOT EXISTS "${table.name}" (${colDefs}, PRIMARY KEY ("id")${fkDefs})`;
    db.exec(sql);

    // Create indexes
    for (const idxSql of table.indexes) {
      db.exec(idxSql);
    }
  }
  console.log("[sqlite] All tables verified/created");
}

// ============================================================
// Query builder helpers
// ============================================================

function buildWhereClause(where: Record<string, any> | undefined, params: any[]): string {
  if (!where || Object.keys(where).length === 0) return "";
  const conditions: string[] = [];
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined || value === null) {
      conditions.push(`"${key}" IS NULL`);
    } else {
      params.push(value);
      conditions.push(`"${key}" = ?`);
    }
  }
  return " WHERE " + conditions.join(" AND ");
}

function buildOrderByClause(orderBy: OrderByClause | OrderByClause[] | undefined): string {
  if (!orderBy) return "";
  const clauses: string[] = [];
  const arr = Array.isArray(orderBy) ? orderBy : [orderBy];
  for (const ob of arr) {
    if (typeof ob === "string") {
      // Prisma field names like "updatedAt" → "updatedAt"
      clauses.push(`"${ob}" ASC`);
    } else {
      clauses.push(`"${ob.field}" ${ob.direction.toUpperCase()}`);
    }
  }
  return " ORDER BY " + clauses.join(", ");
}

function parseOrderByArg(ob: any): OrderByClause[] {
  if (!ob) return [];
  if (typeof ob === "string") return [{ field: ob, direction: "asc" as const }];
  if (Array.isArray(ob)) {
    return ob.map((item: any) => {
      if (typeof item === "string") return { field: item, direction: "asc" as const };
      // item is like { updatedAt: "desc" } or { chapterNumber: "asc" }
      const [field, dir] = Object.entries(item)[0] as [string, string];
      return { field, direction: (dir as "asc" | "desc") || "asc" };
    });
  }
  // Single object like { updatedAt: "desc" }
  const [field, dir] = Object.entries(ob)[0] as [string, string];
  return [{ field, direction: (dir as "asc" | "desc") || "asc" }];
}

// ============================================================
// Row mapper: converts SQLite rows to JS objects with proper types
// ============================================================

function mapRow(row: Record<string, any>, tableDef: TableDef | undefined): Record<string, any> {
  const mapped: Record<string, any> = {};
  if (!tableDef) return row;
  for (const col of tableDef.columns) {
    const val = row[col.name];
    if (col.type === "BOOLEAN") {
      mapped[col.name] = val === 1 || val === true;
    } else if (col.type === "INTEGER") {
      mapped[col.name] = val ?? col.default;
    } else {
      mapped[col.name] = val;
    }
  }
  return mapped;
}

function getTableDef(tableName: string): TableDef | undefined {
  return TABLES.find((t) => t.name === tableName);
}

// ============================================================
// Include resolver: handles include and _count patterns
// ============================================================

function resolveIncludes(
  db: Database.Database,
  tableName: string,
  rows: Record<string, any>[],
  include: Record<string, any> | undefined
): Record<string, any>[] {
  if (!include) return rows;

  const tableDef = getTableDef(tableName);
  const modelRelations = RELATIONS[tableName] || {};

  for (const row of rows) {
    // Handle _count pattern
    if (include._count && typeof include._count === "object" && include._count.select) {
      const counts: Record<string, number> = {};
      for (const relationName of Object.keys(include._count.select)) {
        const rel = modelRelations[relationName];
        if (rel) {
          const countSql = `SELECT COUNT(*) as cnt FROM "${rel.targetTable}" WHERE "${rel.foreignKey}" = ?`;
          const countResult = db.prepare(countSql).get(row.id) as { cnt: number } | undefined;
          counts[relationName] = countResult?.cnt ?? 0;
        }
      }
      row._count = counts;
    }

    // Handle relation includes (skip _count)
    for (const [key, options] of Object.entries(include)) {
      if (key === "_count") continue;

      const rel = modelRelations[key];
      if (!rel) continue;

      const includeOptions = options as Record<string, any> | true;

      if (rel.reverse) {
        // Reverse relation: e.g., specDeltas.spec → find the NovelSpec where specId = row.id
        // Actually for reverse relations, the foreign key is ON the target pointing to our id
        // e.g., SpecDelta has specId → NovelSpec.id, so rel.reverse = "specId"
        // To find the parent, we look up the target table by the foreign key value in our row
        // But wait, our row is a SpecDelta, and specId is in our row
        // So we need to query: SELECT * FROM targetTable WHERE id = row[rel.reverse]

        // Actually no. Let me re-read the relation map:
        // SpecDelta: { spec: { targetTable: "NovelSpec", foreignKey: "id", reverse: "specId" } }
        // This means: to find the "spec" (NovelSpec) for a SpecDelta row,
        // we need to look up NovelSpec where id = row.specId

        const parentId = row[rel.reverse];
        if (parentId !== null && parentId !== undefined) {
          let fetchSql = `SELECT * FROM "${rel.targetTable}" WHERE "id" = ?`;
          const fetchParams: any[] = [parentId];

          if (includeOptions !== true && includeOptions.select) {
            const selectFields = Object.keys(includeOptions.select);
            fetchSql = `SELECT ${selectFields.map((f) => `"${f}"`).join(", ")} FROM "${rel.targetTable}" WHERE "id" = ?`;
          }

          const parentRow = db.prepare(fetchSql).get(...fetchParams) as Record<string, any> | undefined;
          row[key] = parentRow ? mapRow(parentRow, getTableDef(rel.targetTable)) : null;
        } else {
          row[key] = null;
        }
      } else {
        // Forward relation: e.g., Novel.chapters → find all Chapters where novelId = row.id
        let fetchSql = `SELECT * FROM "${rel.targetTable}" WHERE "${rel.foreignKey}" = ?`;
        const fetchParams: any[] = [row.id];

        // Handle orderBy in include
        if (includeOptions !== true && includeOptions.orderBy) {
          const orderClauses = parseOrderByArg(includeOptions.orderBy);
          if (orderClauses.length > 0) {
            fetchSql += buildOrderByClause(orderClauses);
          }
        }

        // Handle take in include
        if (includeOptions !== true && includeOptions.take) {
          fetchSql += ` LIMIT ${includeOptions.take}`;
        }

        let relatedRows = db.prepare(fetchSql).all(...fetchParams) as Record<string, any>[];
        relatedRows = relatedRows.map((r) => mapRow(r, getTableDef(rel.targetTable)));

        // Handle nested include
        if (includeOptions !== true && includeOptions.include) {
          relatedRows = resolveIncludes(db, rel.targetTable, relatedRows, includeOptions.include) as Record<string, any>[];
        }

        row[key] = relatedRows;
      }
    }
  }

  return rows;
}

// ============================================================
// Model proxy factory — creates a Prisma-like model interface
// ============================================================

function createModelProxy(
  tableName: string,
  sqliteGetter: () => Database.Database
): Record<string, any> {
  const tableDef = getTableDef(tableName)!;

  return {
    findMany(options: FindOptions = {}): any[] {
      const db = sqliteGetter();
      const params: any[] = [];

      let sql = `SELECT * FROM "${tableName}"`;

      // WHERE
      if (options.where) {
        sql += buildWhereClause(options.where, params);
      }

      // ORDER BY
      if (options.orderBy) {
        const orderClauses = parseOrderByArg(options.orderBy);
        if (orderClauses.length > 0) {
          sql += buildOrderByClause(orderClauses);
        }
      }

      // LIMIT
      if (options.take) {
        sql += ` LIMIT ${options.take}`;
      }

      let rows = db.prepare(sql).all(...params) as Record<string, any>[];
      rows = rows.map((r) => mapRow(r, tableDef));

      // Handle include
      if (options.include) {
        rows = resolveIncludes(db, tableName, rows, options.include) as Record<string, any>[];
      }

      return rows;
    },

    findUnique(args: { where: Record<string, any>; include?: Record<string, any> }): any {
      const db = sqliteGetter();
      const params: any[] = [];

      let sql = `SELECT * FROM "${tableName}"`;
      sql += buildWhereClause(args.where, params);
      sql += " LIMIT 1";

      let row = db.prepare(sql).get(...params) as Record<string, any> | undefined;
      if (!row) return null;

      row = mapRow(row, tableDef);

      // Handle include
      if (args.include) {
        const rows = resolveIncludes(db, tableName, [row], args.include);
        return rows[0];
      }

      return row;
    },

    findFirst(args: { where?: Record<string, any>; orderBy?: any; include?: Record<string, any> } = {}): any {
      const db = sqliteGetter();
      const params: any[] = [];

      let sql = `SELECT * FROM "${tableName}"`;
      sql += buildWhereClause(args.where, params);

      if (args.orderBy) {
        const orderClauses = parseOrderByArg(args.orderBy);
        if (orderClauses.length > 0) {
          sql += buildOrderByClause(orderClauses);
        }
      }

      sql += " LIMIT 1";

      let row = db.prepare(sql).get(...params) as Record<string, any> | undefined;
      if (!row) return null;

      row = mapRow(row, tableDef);

      if (args.include) {
        const rows = resolveIncludes(db, tableName, [row], args.include);
        return rows[0];
      }

      return row;
    },

    create(args: CreateOptions): any {
      const db = sqliteGetter();
      const data = { ...args.data };
      const now = new Date().toISOString();

      // Generate ID if not provided
      if (!data.id) {
        data.id = randomUUID();
      }

      // Set timestamps (only for columns that exist on the table)
      const columnNames = new Set(tableDef.columns.map((c) => c.name));
      if (!data.createdAt && columnNames.has('createdAt')) {
        data.createdAt = now;
      }
      if (!data.updatedAt && columnNames.has('updatedAt')) {
        data.updatedAt = now;
      }

      // Handle Date objects — convert to ISO strings
      for (const key of Object.keys(data)) {
        if (data[key] instanceof Date) {
          data[key] = data[key].toISOString();
        }
      }

      const columns = Object.keys(data);
      const placeholders = columns.map(() => "?");
      const values = columns.map((col) => {
        // Convert booleans to integers for SQLite
        const colDef = tableDef.columns.find((c) => c.name === col);
        if (colDef?.type === "BOOLEAN") {
          return data[col] ? 1 : 0;
        }
        return data[col];
      });

      const sql = `INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders.join(", ")})`;
      db.prepare(sql).run(...values);

      // Return the created row
      const params: any[] = [data.id];
      let row = db.prepare(`SELECT * FROM "${tableName}" WHERE "id" = ?`).get(...params) as Record<string, any>;
      row = mapRow(row, tableDef);
      return row;
    },

    update(args: UpdateOptions): any {
      const db = sqliteGetter();
      const data = { ...args.data };
      const now = new Date().toISOString();

      // Always update updatedAt (only if column exists on table)
      const columnNames = new Set(tableDef.columns.map((c) => c.name));
      if (columnNames.has('updatedAt')) {
        data.updatedAt = now;
      }

      // Handle Date objects — convert to ISO strings
      for (const key of Object.keys(data)) {
        if (data[key] instanceof Date) {
          data[key] = data[key].toISOString();
        }
      }

      const setClauses = Object.keys(data).map((col) => `"${col}" = ?`);
      const values = Object.keys(data).map((col) => {
        const colDef = tableDef.columns.find((c) => c.name === col);
        if (colDef?.type === "BOOLEAN") {
          return data[col] ? 1 : 0;
        }
        return data[col];
      });

      // WHERE clause
      const whereParams: any[] = [];
      const whereClause = buildWhereClause(args.where, whereParams);

      const sql = `UPDATE "${tableName}" SET ${setClauses.join(", ")}${whereClause}`;
      db.prepare(sql).run(...values, ...whereParams);

      // Return the updated row
      const fetchParams: any[] = [];
      const fetchWhere = buildWhereClause(args.where, fetchParams);
      let row = db.prepare(`SELECT * FROM "${tableName}"${fetchWhere} LIMIT 1`).get(...fetchParams) as Record<string, any>;
      row = mapRow(row, tableDef);
      return row;
    },

    delete(args: { where: Record<string, any> }): any {
      const db = sqliteGetter();

      // Fetch the row first (to return it)
      const fetchParams: any[] = [];
      const fetchWhere = buildWhereClause(args.where, fetchParams);
      let row = db.prepare(`SELECT * FROM "${tableName}"${fetchWhere} LIMIT 1`).get(...fetchParams) as Record<string, any> | undefined;

      // Delete
      const delParams: any[] = [];
      const delWhere = buildWhereClause(args.where, delParams);
      db.prepare(`DELETE FROM "${tableName}"${delWhere}`).run(...delParams);

      if (!row) return null;
      return mapRow(row, tableDef);
    },
  };
}

// ============================================================
// createSqliteDb — main export
// ============================================================

export function createSqliteDb() {
  const sqliteGetter = () => getSqliteDb();

  return {
    // Model proxies
    user: createModelProxy("User", sqliteGetter),
    novel: createModelProxy("Novel", sqliteGetter),
    chapter: createModelProxy("Chapter", sqliteGetter),
    character: createModelProxy("Character", sqliteGetter),
    worldSetting: createModelProxy("WorldSetting", sqliteGetter),
    agentTask: createModelProxy("AgentTask", sqliteGetter),
    novelSpec: createModelProxy("NovelSpec", sqliteGetter),
    specDelta: createModelProxy("SpecDelta", sqliteGetter),
    changeProposal: createModelProxy("ChangeProposal", sqliteGetter),
    chapterSnapshot: createModelProxy("ChapterSnapshot", sqliteGetter),
    branch: createModelProxy("Branch", sqliteGetter),

    // Raw query support
    $queryRaw(template: TemplateStringsArray, ...values: any[]): Promise<any> {
      const db = sqliteGetter();
      // Convert tagged template to a plain SQL string
      const sql = template[0]; // Simple: just take the first part
      // Handle `SELECT 1` and similar simple queries
      if (template.length === 1) {
        const result = db.prepare(sql).get();
        return Promise.resolve(result);
      }
      return Promise.resolve(null);
    },

    $executeRawUnsafe(sql: string, ...params: any[]): Promise<number> {
      const db = sqliteGetter();
      try {
        db.exec(sql);
        return Promise.resolve(0);
      } catch (err) {
        console.warn(`[sqlite] Raw SQL warning: ${(err as Error).message?.slice(0, 100) || "unknown"}`);
        return Promise.resolve(0);
      }
    },
  };
}
