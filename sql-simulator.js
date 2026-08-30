// ============================================================
// QUERYQUEST — Simulador SQL via IndexedDB
// Engine leve que suporta: SELECT, INSERT, UPDATE, DELETE,
//   WHERE, ORDER BY, LIMIT, JOIN (INNER/LEFT), GROUP BY, HAVING, COUNT/SUM/AVG/MAX/MIN
// Zero dependências externas. Funciona 100% offline.
// ============================================================

export class SqlSimulator {
  constructor(dbName = 'QueryQuestSql', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  /* ---- Init / Schema ---- */
  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = () => {
        const db = req.result;
        // Store genérica por nome de tabela — cada row tem {__table, __id, ...data}
        if (!db.objectStoreNames.contains('raw')) {
          db.createObjectStore('raw', { keyPath: '__key' });
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };
      req.onerror = () => reject(new Error(req.error?.message || 'IndexedDB falhou'));
    });
  }

  /* ---- Helpers: get object store for a table ---- */
  _store(txMode = 'readonly') {
    if (!this.db) throw new Error('Database não inicializado');
    const tx = this.db.transaction('raw', txMode);
    return tx.objectStore('raw');
  }

  /* ---- CRUD on arbitrary tables ---- */
  async createTable(name, schema) {
    await this.init();
    const store = this._store('readwrite');
    // Create marker to track table metadata
    const metaKey = `__meta_${name}`;
    const existsReq = store.get(metaKey);
    const meta = await new Promise((res) => {
      existsReq.onsuccess = () => res(existsReq.result ? existsReq.result.schema : {});
      existsReq.onerror = () res({});
    });
    Object.assign(meta, schema);
    store.put({ __key: metaKey, schema: meta, type: '__meta' });
    // Seed empty rows array metadata
    const countKey = `__count_${name}`;
    const existing = await new Promise((res) => {
      const r = store.get(countKey);
      r.onsuccess = () => res(r.result?.count || 0);
      r.onerror = () => res(0);
    });
    store.put({ __key: countKey, count: existing, type: '__count' });
    return name;
  }

  async dropTable(name) {
    await this.init();
    const store = this._store('readwrite');
    const tx = store.transaction;
    // Delete all rows for this table
    const idx = store.index('__tablename');
    // IndexedDB doesn't have range delete by key prefix easily, use getAllKeys then iterate
    const allRows = await this.getAllRecords(name);
    for (const r of allRows) {
      store.delete(`__row_${r.__id}`);
    }
    store.delete(`__meta_${name}`);
    store.delete(`__count_${name}`);
    // Also clean raw keys that match
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  }

  async insertRow(tableName, data) {
    await this.init();
    const store = this._store('readwrite');
    const row = {
      __key: `__row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      __tablename: tableName,
      __id: Date.now(),
      __createdAt: new Date().toISOString()
    };
    Object.assign(row, data);
    return new Promise((resolve, reject) => {
      const req = store.put(row);
      req.onsuccess = () => {
        // Increment counter
        this._incCounter(tableName).then(() => resolve());
        resolve();
      };
      req.onerror = () => reject(new Error(req.error?.message || 'Insert failed'));
    });
  }

  async selectAll(tableName, options = {}) {
    await this.init();
    const records = await this.getAllRecords(tableName);

    let results = [...records];

    // WHERE filter
    if (options.where) {
      results = results.filter(r => this._evalWhere(options.where, r));
    }

    // Column projection
    if (options.columns && options.columns.length > 0) {
      results = results.map(r => {
        const proj = {};
        for (const col of options.columns) {
          if (col in r) proj[col] = r[col];
        }
        return proj;
      });
    }

    // DISTINCT
    if (options.distinct) {
      const seen = new Set();
      results = results.filter(r => {
        const key = JSON.stringify(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // ORDER BY
    if (options.orderBy) {
      results.sort((a, b) => {
        const cols = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy];
        for (const colDef of cols) {
          const col = colDef.column || colDef;
          const dir = colDef.dir === 'DESC' ? -1 : 1;
          const va = a[col] !== undefined ? a[col] : null;
          const vb = b[col] !== undefined ? b[col] : null;
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
        }
        return 0;
      });
    }

    // LIMIT / OFFSET
    if (options.limit != null) {
      results = results.slice(0, options.limit);
    }
    if (options.offset != null) {
      results = results.slice(options.offset);
    }

    return results;
  }

  async updateRows(tableName, updates, where = {}) {
    await this.init();
    const records = await this.getAllRecords(tableName);
    let affected = 0;
    const store = this._store('readwrite');

    for (const rec of records) {
      if (this._evalWhere(where, rec)) {
        Object.assign(rec, updates);
        store.put(rec);
        affected++;
      }
    }
    return affected;
  }

  async deleteRows(tableName, where = {}) {
    await this.init();
    const records = await this.getAllRecords(tableName);
    let affected = 0;
    const store = this._store('readwrite');

    for (const rec of records) {
      if (this._evalWhere(where, rec)) {
        store.delete(rec.__key);
        affected++;
      }
    }
    return affected;
  }

  async deleteRecord(tableName, id) {
    await this.init();
    const store = this._store('readwrite');
    const record = await new Promise((resolve, reject) => {
      const req = store.get(`__row_${id}`);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (record) {
      store.delete(record.__key);
      return 1;
    }
    return 0;
  }

  async countRecords(tableName) {
    const records = await this.getAllRecords(tableName);
    return records.length;
  }

  async getAllRecords(tableName) {
    await this.init();
    const store = this._store('readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        const filtered = all.filter(r =>
          r && r.__tablename === tableName && r.type !== '__meta' && r.type !== '__count'
        );
        resolve(filtered);
      };
      req.onerror = () => reject(new Error(req.error?.message || 'Get failed'));
    });
  }

  async getSchema(tableName) {
    await this.init();
    const store = this._store('readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(`__meta_${tableName}`);
      req.onsuccess = () => resolve(req.result?.schema || {});
      req.onerror = () => resolve({});
    });
  }

  async _incCounter(tableName) {
    try {
      const store = this._store('readwrite');
      const key = `__count_${tableName}`;
      const existing = await new Promise(res => {
        const r = store.get(key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      });
      store.put({ __key: key, count: (existing?.count || 0) + 1, type: '__count' });
    } catch {}
  }

  /* ---- WHERE evaluator ---- */
  _evalWhere(condition, row) {
    if (!condition) return true;

    if (typeof condition === 'object') {
      if (Array.isArray(condition)) {
        // Multiple conditions joined with AND
        return condition.every(c => this._evalWhere(c, row));
      }

      // Single condition object: { column: value } or { column: { op: val } }
      for (const [col, val] of Object.entries(condition)) {
        const actual = row[col];
        if (typeof val === 'object' && !Array.isArray(val)) {
          // Operator syntax
          for (const [op, expected] of Object.entries(val)) {
            if (!this._compare(actual, op, expected)) return false;
          }
        } else {
          // Simple equality
          if (actual !== val) return false;
        }
      }
    }
    return true;
  }

  _compare(actual, op, expected) {
    // Normalize types for comparison
    const a = typeof actual === 'boolean' ? (actual ? 1 : 0) : actual;
    const b = typeof expected === 'boolean' ? (expected ? 1 : 0) : expected;

    switch (op) {
      case '=': case '==': case 'eq': return a == b;
      case '===': case 'eq_exact': return a === b;
      case '!=': case '<>': case 'neq': return a != b;
      case '!==': return a !== b;
      case '>': return a > b;
      case '>=': return a >= b;
      case '<': return a < b;
      case '<=': return a <= b;
      case 'like': {
        // Convert SQL LIKE pattern to regex
        const pattern = String(expected).replace(/%/g, '.*').replace(/_/g, '.');
        return new RegExp(`^${pattern}$`, 'i').test(String(a ?? ''));
      }
      case 'in': return Array.isArray(b) && b.includes(a);
      case 'not_in': return Array.isArray(b) && !b.includes(a);
      case 'between': return Array.isArray(b) && b.length === 2 && a >= b[0] && a <= b[1];
      case 'is_null': return a === null;
      case 'is_not_null': return a !== null;
      default: return a == b;
    }
  }

  /* ---- JOIN support ---- */
  async joinTables(leftTable, leftOn, rightTable, rightOn, type = 'inner') {
    await this.init();
    const leftRows = await this.getAllRecords(leftTable);
    const rightRows = await this.getAllRecords(rightTable);

    let results = [];

    for (const lr of leftRows) {
      const matches = rightRows.filter(rr => {
        // Build a combined condition from both sides
        const condition = {};
        for (const [k, v] of Object.entries(leftOn)) {
          if (typeof v === 'object') {
            // Join condition like { field: { eq: otherField } }
            const otherField = v.field || v.ref;
            if (otherField) {
              const expected = rr[otherField];
              if (!this._compare(lr[k], '=', expected)) return false;
            }
          } else {
            if (lr[k] !== v) return false;
          }
        }
        for (const [k, v] of Object.entries(rightOn)) {
          if (typeof v === 'object') {
            const otherField = v.field || v.ref;
            if (otherField) {
              const expected = lr[otherField];
              if (!this._compare(rr[k], '=', expected)) return false;
            }
          } else {
            if (rr[k] !== v) return false;
          }
        }
        return true;
      });

      if (matches.length > 0) {
        for (const mr of matches) {
          results.push({ ...lr, ...mr });
        }
      } else if (type === 'left') {
        results.push({ ...lr });
      }
    }

    return results;
  }

  /* ---- Aggregation helpers ---- */
  async aggregate(tableName, ops, groupBy = []) {
    await this.init();
    const records = await this.getAllRecords(tableName);

    // Group
    const groups = {};
    for (const r of records) {
      const key = groupBy.length > 0
        ? groupBy.map(g => r[g] ?? '__NULL__').join('|')
        : '__all__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }

    // Aggregate each group
    const results = [];
    for (const [key, group] of Object.entries(groups)) {
      const row = {};
      if (groupBy.length > 0) {
        const parts = key.split('|');
        groupBy.forEach((g, i) => { row[g] = group[0][g]; });
      }
      for (const op of ops) {
        const fn = op.fn;
        const col = op.column;
        if (!col) continue;
        const values = group.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
        switch (fn) {
          case 'COUNT': row[op.alias || `count`] = values.length; break;
          case 'SUM': row[op.alias || `sum`] = values.reduce((s, v) => s + (parseFloat(v) || 0), 0); break;
          case 'AVG': row[op.alias || `avg`] = values.length ? values.reduce((s, v) => s + (parseFloat(v) || 0), 0) / values.length : 0; break;
          case 'MIN': row[op.alias || `min`] = Math.min(...values.map(Number)); break;
          case 'MAX': row[op.alias || `max`] = Math.max(...values.map(Number)); break;
        }
      }
      results.push(row);
    }

    return results;
  }

  /* ---- Public EXEC interface used by app.js ---- */
  async exec(sqlStr) {
    await this.init();
    const sql = sqlStr.trim().replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').trim();

    const upper = sql.toUpperCase();

    // Detect statement type
    if (upper.startsWith('SELECT')) {
      return this._execSelect(sql);
    } else if (upper.startsWith('INSERT INTO') || upper.startsWith('INSERT')) {
      return this._execInsert(sql);
    } else if (upper.startsWith('UPDATE')) {
      return this._execUpdate(sql);
    } else if (upper.startsWith('DELETE FROM') || upper.startsWith('DELETE')) {
      return this._execDelete(sql);
    } else if (upper.startsWith('CREATE TABLE')) {
      return this._execCreateTable(sql);
    } else if (upper.startsWith('DROP TABLE')) {
      const nameMatch = sql.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
      const name = nameMatch?.[1];
      if (name) {
        try { await this.dropTable(name); } catch {}
      }
      return { type: 'affected', affected: 0 };
    } else if (upper.startsWith('ALTER TABLE')) {
      return { type: 'affected', affected: 0, message: 'ALTER TABLE simplificado — ignorado neste simulador' };
    } else {
      return { type: 'error', message: `Statement tipo "${sql.split(/\s+/)[0]}" não suportado` };
    }
  }

  /* ---- PARSER: SELECT ---- */
  async _execSelect(sql) {
    try {
      const parsed = this._parseSelect(sql);
      let results = [];

      if (parsed.joins && parsed.joins.length > 0) {
        // Multi-table query
        let currentLeft = parsed.table;
        let currentLeftFields = parsed.fields;
        let fieldsToProject = parsed.selectFields;

        for (const join of parsed.joins) {
          const joined = await this.joinTables(
            currentLeft,
            join.onLeft || {},
            join.table,
            join.onRight || {},
            join.type || 'inner'
          );
          currentLeft = `_joined`;
          currentLeftFields = joined.map(r => ({ ...r }));
          // Merge into results temp storage
          window.__simTempJoinData = joined;
        }

        // Get results from temp join
        if (window.__simTempJoinData) {
          results = window.__simTempJoinData;
          delete window.__simTempJoinData;
        } else {
          results = await this.selectAll(currentLeft);
        }
      } else {
        // Single table SELECT
        const selectFields = parsed.selectFields || [];
        const distinct = parsed.distinct;
        const aggOps = parsed.aggregations || [];

        if (aggOps.length > 0 || parsed.groupBy) {
          // Aggregation query
          results = await this.aggregate(parsed.table, aggOps, parsed.groupBy || []);
        } else {
          const options = {
            columns: selectFields.length > 0 && !selectFields.includes('*') ? selectFields : [],
            distinct: !!distinct
          };

          if (parsed.where) {
            options.where = parsed.where;
          }

          if (parsed.orderBy) {
            options.orderBy = parsed.orderBy;
          }

          if (parsed.limit != null) {
            options.limit = parsed.limit;
          }

          if (parsed.offset != null) {
            options.offset = parsed.offset;
          }

          results = await this.selectAll(parsed.table, options);
        }
      }

      return { type: 'rows', rows: results };
    } catch (err) {
      return { type: 'error', message: err.message };
    }
  }

  /* ---- PARSER: INSERT ---- */
  async _execInsert(sql) {
    try {
      const tableNameMatch = sql.match(/INTO\s+(\w+)/i);
      if (!tableNameMatch) throw new Error(' Sintaxe INSERT inválida');
      const tableName = tableNameMatch[1];

      // Check table exists
      const schema = await this.getSchema(tableName);
      if (Object.keys(schema).length === 0) {
        throw new Error(`Tabela "${tableName}" não existe. Crie-a primeiro.`);
      }

      const colsMatch = sql.match(/\(([^)]+)\)/);
      const valuesMatch = sql.match(/VALUES\s*\((.+)\)/is);

      if (!colsMatch || !valuesMatch) {
        // Try multi-value insert
        const multiVals = sql.match(/VALUES\s*(\(.+\))/gs);
        if (multiVals) {
          for (const mv of multiVals) {
            const innerCols = colsMatch[1];
            const vals = mv.match(/\((.+?)\)/s)?.[1]?.split(',');
            if (vals) {
              const data = {};
              const colArr = innerCols.split(',').map(c => c.trim());
              for (let i = 0; i < colArr.length && i < vals.length; i++) {
                data[colArr[i]] = this._parseValue(vals[i].trim());
              }
              await this.insertRow(tableName, data);
            }
          }
          return { type: 'affected', affected: multiVals.length };
        }
        throw new Error('Sintaxe INSERT incompleta');
      }

      const cols = colsMatch[1].split(',').map(c => c.trim());
      const valsStr = valuesMatch[1];
      // Handle multi-values
      const isMulti = valsStr.includes('),(');
      if (isMulti) {
        const individual = valsStr.match(/\(([^)]+)\)/g);
        if (individual) {
          for (const indiv of individual) {
            const vInner = indiv.replace(/[()]/g, '');
            const vals = this._splitValues(vInner);
            const data = {};
            for (let i = 0; i < cols.length && i < vals.length; i++) {
              data[cols[i]] = this._parseValue(vals[i].trim());
            }
            await this.insertRow(tableName, data);
          }
          return { type: 'affected', affected: individual.length };
        }
      }

      const vals = this._splitValues(valsStr);
      const data = {};
      for (let i = 0; i < cols.length && i < vals.length; i++) {
        data[cols[i]] = this._parseValue(vals[i].trim());
      }
      await this.insertRow(tableName, data);
      return { type: 'affected', affected: 1 };
    } catch (err) {
      return { type: 'error', message: err.message };
    }
  }

  /* ---- PARSER: UPDATE ---- */
  async _execUpdate(sql) {
    try {
      const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*)/si);
      if (!updateMatch) throw new Error('Sintaxe UPDATE inválida');

      const tableName = updateMatch[1];
      const setClause = updateMatch[2];

      // Parse SET assignments
      const assignments = {};
      const parts = this._splitAssignments(setClause);
      for (const part of parts) {
        const eqIdx = part.indexOf('=');
        if (eqIdx === -1) continue;
        const col = part.slice(0, eqIdx).trim();
        const val = part.slice(eqIdx + 1).trim();
        assignments[col] = this._parseValue(val);
      }

      // Parse WHERE
      const whereClause = sql.match(/WHERE\s+(.+)$/is);
      const where = whereClause ? this._parseWhereCondition(whereClause[1]) : {};

      const affected = await this.updateRows(tableName, assignments, where);
      return { type: 'affected', affected };
    } catch (err) {
      return { type: 'error', message: err.message };
    }
  }

  /* ---- PARSER: DELETE ---- */
  async _execDelete(sql) {
    try {
      const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/is);
      if (!deleteMatch) throw new Error('Sintaxe DELETE inválida');

      const tableName = deleteMatch[1];
      const whereClause = deleteMatch[2];
      const where = whereClause ? this._parseWhereCondition(whereClause) : {};

      const affected = await this.deleteRows(tableName, where);
      return { type: 'affected', affected };
    } catch (err) {
      return { type: 'error', message: err.message };
    }
  }

  /* ---- PARSER: CREATE TABLE ---- */
  async _execCreateTable(sql) {
    try {
      const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\((.+)\)/is);
      if (!match) throw new Error('Sintaxe CREATE TABLE inválida');

      const name = match[1];
      const schemaStr = match[2];
      const schema = {};

      for (const colDef of schemaStr.split(',')) {
        const parts = colDef.trim().split(/\s+/);
        if (parts.length >= 2) {
          const colName = parts[0];
          const rest = parts.slice(1).join(' ');
          schema[colName] = rest;
        }
      }

      await this.createTable(name, schema);
      return { type: 'affected', affected: 1, message: `Tabela "${name}" criada` };
    } catch (err) {
      return { type: 'error', message: err.message };
    }
  }

  /* ---- Value parser ---- */
  _parseValue(str) {
    if (str === 'NULL' || str === 'null' || str === '') return null;
    if (str === 'TRUE' || str === 'true' || str === '1') return true;
    if (str === 'FALSE' || str === 'false' || str === '0') return false;
    // String literal
    if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'))) {
      return str.slice(1, -1);
    }
    // Number
    if (!isNaN(str) && str !== '') return Number(str);
    // Boolean-like
    if (str === 'true') return true;
    if (str === 'false') return false;
    return str;
  }

  _splitValues(str) {
    // Split by comma, but respect parentheses and quotes
    const result = [];
    let current = '';
    let parenDepth = 0;
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (inQuote) {
        current += ch;
        if (ch === quoteChar && str[i-1] !== '\\') inQuote = false;
      } else if (ch === "'" || ch === '"') {
        inQuote = true;
        quoteChar = ch;
        current += ch;
      } else if (ch === '(') {
        parenDepth++;
        current += ch;
      } else if (ch === ')') {
        parenDepth--;
        current += ch;
      } else if (ch === ',' && parenDepth === 0) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) result.push(current.trim());
    return result;
  }

  _splitAssignments(str) {
    return this._splitValues(str);
  }

  /* ---- WHERE condition parser ---- */
  _parseWhereCondition(whereStr) {
    // Simplified parser: handles basic AND/OR chains
    // e.g., "id = 1 AND feito = FALSE AND titulo LIKE '%SQL%'"

    const tokens = this._tokenize(whereStr);
    const result = this._parseExpr(tokens, 0);
    return result.condition;
  }

  _tokenize(input) {
    const tokens = [];
    let i = 0;
    while (i < input.length) {
      // Skip whitespace
      if (/\s/.test(input[i])) { i++; continue; }

      // Operators
      if (input.slice(i, i+2) === '!=' || input.slice(i, i+2) === '<>') {
        tokens.push({ type: 'OP', value: '!=' }); i += 2; continue;
      }
      if (input.slice(i, i+2) === '>=') { tokens.push({ type: 'OP', value: '>=' }); i += 2; continue; }
      if (input.slice(i, i+2) === '<=') { tokens.push({ type: 'OP', value: '<=' }); i += 2; continue; }
      if (input[i] === '>' || input[i] === '<' || input[i] === '=') {
        tokens.push({ type: 'OP', value: input[i] }); i++; continue;
      }

      // AND / OR
      if (input.slice(i, i+2).toUpperCase() === 'AND') {
        tokens.push({ type: 'LOGIC', value: 'AND' }); i += 3; continue;
      }
      if (input.slice(i, i+2).toUpperCase() === 'OR') {
        tokens.push({ type: 'LOGIC', value: 'OR' }); i += 2; continue;
      }

      // Parentheses
      if (input[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
      if (input[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }

      // LIKE / IN / BETWEEN / IS / NOT / NULL / TRUE / FALSE
      if (input.slice(i, i+4).toUpperCase() === 'LIKE') { tokens.push({ type: 'OP', value: 'like' }); i += 4; continue; }
      if (input.slice(i, i+2).toUpperCase() === 'IN') { tokens.push({ type: 'OP', value: 'in' }); i += 2; continue; }
      if (input.slice(i, i+7).toUpperCase() === 'BETWEEN') { tokens.push({ type: 'OP', value: 'between' }); i += 7; continue; }
      if (input.slice(i, i+2).toUpperCase() === 'IS') { tokens.push({ type: 'OP', value: 'is' }); i += 2; continue; }
      if (input.slice(i, i+3).toUpperCase() === 'NOT') { tokens.push({ type: 'LOGIC', value: 'NOT' }); i += 3; continue; }

      // Literal: string
      if (input[i] === "'" || input[i] === '"') {
        const q = input[i];
        let j = i + 1;
        while (j < input.length && input[j] !== q) {
          if (input[j] === '\\' && j + 1 < input.length) j++;
          j++;
        }
        tokens.push({ type: 'VALUE', value: input.slice(i, j + 1) });
        i = j + 1;
        continue;
      }

      // Number or identifier
      let start = i;
      while (i < input.length && !/\s|\(|\)|,|!|=|>|</.test(input[i])) i++;
      const word = input.slice(start, i).toUpperCase();
      if (word === 'NULL') tokens.push({ type: 'VALUE', value: null });
      else if (word === 'TRUE') tokens.push({ type: 'VALUE', value: true });
      else if (word === 'FALSE') tokens.push({ type: 'VALUE', value: false });
      else if (!isNaN(word) && word !== '') tokens.push({ type: 'VALUE', value: Number(word) });
      else tokens.push({ type: 'IDENT', value: word });
    }
    return tokens;
  }

  _parseExpr(tokens, pos) {
    let left = this._parseAnd(tokens, pos);
    pos = left.pos;

    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.type === 'LOGIC' && tok.value === 'OR') {
        pos++;
        const right = this._parseAnd(tokens, pos);
        pos = right.pos;
        const saved = left.condition;
        left = {
          condition: [saved, right.condition], // will be OR'd
          logic: 'OR'
        };
      } else if (tok.type === 'LOGIC' && tok.value === 'AND') {
        pos++;
        const right = this._parseAnd(tokens, pos);
        pos = right.pos;
        left.condition = [left.condition, right.condition];
      } else {
        break;
      }
    }

    return { condition: this._normalizeCond(left.condition, left.logic), pos };
  }

  _parseAnd(tokens, pos) {
    let left = this._parseComparison(tokens, pos);
    pos = left.pos;
    // AND has higher precedence, handled above in _parseExpr
    return { condition: left.condition, pos };
  }

  _parseComparison(tokens, pos) {
    if (tokens[pos]?.type === 'LPAREN') {
      pos++;
      const expr = this._parseExpr(tokens, pos);
      pos = expr.pos;
      if (tokens[pos]?.type === 'RPAREN') pos++;
      return { condition: expr.condition, pos };
    }

    const ident = tokens[pos];
    if (!ident || ident.type !== 'IDENT') throw new Error(`Identificador esperado na posição ${pos}`);
    const col = ident.value.toLowerCase();
    pos++;

    if (tokens[pos]?.type === 'OP' && tokens[pos].value === 'is') {
      pos++;
      const notTok = tokens[pos];
      if (notTok?.value === 'not') {
        pos++;
        const nullTok = tokens[pos];
        if (nullTok?.value === null) {
          pos++;
          return { condition: { [col]: { is_not_null: null } }, pos };
        }
      }
      return { condition: { [col]: { is_null: null } }, pos };
    }

    if (tokens[pos]?.type === 'OP' && tokens[pos].value === 'like') {
      pos++;
      const valTok = tokens[pos++];
      return { condition: { [col]: { like: valTok.value } }, pos };
    }

    if (tokens[pos]?.type === 'OP' && tokens[pos].value === 'in') {
      pos++;
      if (tokens[pos]?.type === 'LPAREN') {
        pos++;
        const items = [];
        while (tokens[pos]?.type !== 'RPAREN' && pos < tokens.length) {
          if (tokens[pos]?.type === 'VALUE') items.push(tokens[pos].value);
          if (tokens[pos]?.type === 'IDENT' && tokens[pos].value) items.push(tokens[pos].value);
          if (tokens[pos]?.type === 'COMMA') pos++;
          pos++;
        }
        if (tokens[pos]?.type === 'RPAREN') pos++;
        return { condition: { [col]: { in: items } }, pos };
      }
    }

    if (tokens[pos]?.type === 'OP' && tokens[pos].value === 'between') {
      pos++;
      const lowTok = tokens[pos++];
      const highTok = tokens[pos++];
      return { condition: { [col]: { between: [lowTok.value, highTok.value] } }, pos };
    }

    // Comparison operator
    if (tokens[pos]?.type === 'OP') {
      const op = tokens[pos].value;
      pos++;
      const valTok = tokens[pos++];
      const cmpOp = this._translateOperator(op);
      return { condition: { [col]: { [cmpOp]: valTok?.value } }, pos };
    }

    // Direct value assignment (e.g., WHERE coluna = valor implicit)
    if (tokens[pos]?.type === 'VALUE' || tokens[pos]?.type === 'IDENT') {
      const valTok = tokens[pos++];
      return { condition: { [col]: valTok.value }, pos };
    }

    return { condition: {}, pos };
  }

  _translateOperator(op) {
    const map = { '=': 'eq', '==': 'eq', '!=': 'neq', '<>': 'neq', '<': 'lt', '>': 'gt', '<=': 'lte', '>=': 'gte' };
    return map[op] || 'eq';
  }

  _normalizeCond(cond, logic = 'AND') {
    if (!cond) return {};
    if (Array.isArray(cond)) {
      if (logic === 'OR') {
        // For OR we flatten and return as-is for the outer evaluator
        // Actually need different handling: wrap in array for OR evaluation
        return { _or: cond };
      }
      return { _and: cond };
    }
    return cond;
  }

  /* ---- SELECT parser (full) ---- */
  _parseSelect(sql) {
    const upper = sql.toUpperCase();
    let remaining = sql.trim();

    const result = {
      table: '',
      selectFields: [],
      distinct: false,
      joins: [],
      where: {},
      orderBy: [],
      limit: null,
      offset: null,
      aggregations: []
    };

    // Remove leading keyword
    remaining = remaining.replace(/^SELECT\s+/i, '');

    // DISTINCT
    if (remaining.toUpperCase().startsWith('DISTINCT')) {
      result.distinct = true;
      remaining = remaining.replace(/^\s*DSTINCT\s+/i, '');
    }

    // Select list
    const fromIdx = this._findKeywordPos(remaining, 'FROM');
    if (fromIdx === -1) throw new Error('Consulta SELECT sem FROM encontrada');

    const selectClause = remaining.slice(0, fromIdx).trim();
    result.selectFields = selectClause.split(',').map(f => f.trim().toLowerCase()).map(f => {
      // Handle aliases: col AS alias, or just col
      f = f.replace(/\sas\s+/gi, ' AS ').split(/\s+(?:AS)\s+/i).pop().trim();
      // Function calls: COUNT(col) -> extract function
      const funcMatch = f.match(/^(count|sum|avg|min|max)\s*\((.+?)\)(?:\s+as\s+(\w+))?$/i);
      if (funcMatch) {
        result.aggregations.push({
          fn: funcMatch[1].toUpperCase(),
          column: funcMatch[2].trim().toLowerCase(),
          alias: funcMatch[3]?.toLowerCase() || `${funcMatch[1]}_${funcMatch[2].trim().toLowerCase()}`
        });
        return null;
      }
      return f;
    }).filter(Boolean);

    remaining = remaining.slice(fromIdx).trim();

    // FROM table
    const joinFromResult = this._parseFromClause(remaining);
    result.table = joinFromResult.table;
    remaining = joinFromResult.remaining;

    // JOINs
    while (/^\s*(?:LEFT|RIGHT|INNER|OUTER|CROSS|JOIN)\s+/i.test(remaining)) {
      const joinResult = this._parseJoin(remaining);
      result.joins.push(joinResult.join);
      remaining = joinResult.remaining;
    }

    // WHERE
    const whereIdx = this._findKeywordPos(remaining, 'WHERE');
    if (whereIdx !== -1) {
      const whereClause = remaining.slice(0, whereIdx).trim();
      result.where = this._parseWhereCondition(whereClause);
      remaining = remaining.slice(whereIdx).trim();
    }

    // GROUP BY
    const groupIdx = this._findKeywordPos(remaining, 'GROUP BY');
    if (groupIdx !== -1) {
      const gbClause = remaining.slice(0, groupIdx).trim();
      remaining = remaining.slice(groupIdx).trim();
      result.groupBy = gbClause.split(',').map(c => c.trim().toLowerCase());
    }

    // HAVING
    const havingIdx = this._findKeywordPos(remaining, 'HAVING');
    if (havingIdx !== -1) {
      // HAVING filters after aggregation — skip for now, simplified
      remaining = remaining.slice(havingIdx).trim();
    }

    // ORDER BY
    const orderIdx = this._findKeywordPos(remaining, 'ORDER BY');
    if (orderIdx !== -1) {
      const obClause = remaining.slice(0, orderIdx).trim();
      remaining = remaining.slice(orderIdx).trim();
      result.orderBy = obClause.split(',').map(c => {
        const parts = c.trim().split(/\s+/);
        return { column: parts[0].toLowerCase(), dir: parts[1]?.toUpperCase() || 'ASC' };
      });
    }

    // LIMIT
    const limitIdx = this._findKeywordPos(remaining, 'LIMIT');
    if (limitIdx !== -1) {
      const limClause = remaining.slice(limitIdx).trim();
      const numMatch = limClause.match(/(\d+)/);
      result.limit = numMatch ? parseInt(numMatch[1]) : null;
    }

    // OFFSET
    const offIdx = this._findKeywordPos(remaining, 'OFFSET');
    if (offIdx !== -1) {
      const offClause = remaining.slice(offIdx).trim();
      const numMatch = offClause.match(/(\d+)/);
      result.offset = numMatch ? parseInt(numMatch[1]) : null;
    }

    return result;
  }

  _parseFromClause(sql) {
    const idx = this._findKeywordPos(sql, 'JOIN') !== -1 ? this._findKeywordPos(sql, 'JOIN') :
                 this._findKeywordPos(sql, 'WHERE') !== -1 ? this._findKeywordPos(sql, 'WHERE') :
                 this._findKeywordPos(sql, 'ORDER BY') !== -1 ? this._findKeywordPos(sql, 'ORDER BY') :
                 this._findKeywordPos(sql, 'GROUP BY') !== -1 ? this._findKeywordPos(sql, 'GROUP BY') :
                 this._findKeywordPos(sql, 'LIMIT') !== -1 ? this._findKeywordPos(sql, 'LIMIT') :
                 this._findKeywordPos(sql, 'OFFSET') !== -1 ? this._findKeywordPos(sql, 'OFFSET') :
                 this._findKeywordPos(sql, 'HAVING') !== -1 ? this._findKeywordPos(sql, 'HAVING') : -1;

    let table = sql.trim().split(/\s+/)[0].toLowerCase();

    // Handle alias: table_name AS alias or just table_name alias
    const parts = sql.trim().split(/\s+/);
    if (parts[1]?.toUpperCase() === 'AS') {
      table = parts[0].toLowerCase();
    }

    const remaining = sql.slice(idx !== -1 ? idx : sql.length).trim();
    return { table, remaining };
  }

  _parseJoin(sql) {
    const match = sql.match(/^(LEFT|RIGHT|INNER|OUTER|CROSS|JOIN|)\s+(JOIN|)\s+(\w+)\s*(?:AS\s+)?(\w+)?\s+ON\s+(.+?)(?=\s+(?:LEFT|RIGHT|INNER|OUTER|CROSS|JOIN|WHERE|ORDER|GROUP|LIMIT|OFFSET|HAVING)\b|$)/is);
    if (!match) throw new Error('Sintaxe JOIN inválida');

    const joinType = match[1] ? match[1].toUpperCase() + ' ' + (match[2]?.toUpperCase() || 'JOIN') : 'INNER JOIN';
    const table = match[3].toLowerCase();
    const alias = match[4]?.toLowerCase();
    const onClause = match[5]?.trim();

    // Parse ON clause simply: t1.col1 = t2.col2
    const onParts = this._splitValues(onClause);
    const leftOn = {};
    const rightOn = {};
    for (const part of onParts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) continue;
      const leftPart = part.slice(0, eqIdx).trim();
      const rightPart = part.slice(eqIdx + 1).trim();

      // Format: table_or_alias.col
      const leftCol = leftPart.includes('.') ? leftPart.split('.').pop() : leftPart;
      const rightCol = rightPart.includes('.') ? rightPart.split('.').pop() : rightPart;

      leftOn[leftCol] = { field: rightCol };
      rightOn[rightCol] = { field: leftCol };
    }

    const remaining = sql.slice(match.index + match[0].length).trim();

    return {
      join: { type: joinType, table, onLeft: leftOn, onRight: rightOn },
      remaining
    };
  }

  _findKeywordPos(str, keyword) {
    const upper = str.toUpperCase();
    const kwUpper = keyword.toUpperCase();
    let i = 0;
    while (i <= upper.length - kwUpper.length) {
      if (upper.slice(i, i + kwUpper.length) === kwUpper) {
        // Ensure it's a whole word (preceded/followed by space or at boundary)
        const beforeOk = i === 0 || /\s/.test(str[i-1]);
        const afterOk = i + kwUpper.length >= str.length || /\s/.test(str[i + kwUpper.length]);
        if (beforeOk && afterOk) return i;
      }
      i++;
    }
    return -1;
  }
}

/* ---- Module export ---- */
// For use via import in app.js
// If browser module import fails, attach to global
if (typeof window !== 'undefined') {
  window.SqlSimulator = SqlSimulator;
}
