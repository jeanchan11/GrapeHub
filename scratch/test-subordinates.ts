import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resolveCollaboratorId(pool: any, email: string): Promise<number | null> {
  const { rows } = await pool.query(
    `SELECT c.id FROM collaborators c JOIN users u ON c.linked_user_id = u.id WHERE u.email = $1 LIMIT 1`,
    [email]
  );
  return rows.length > 0 ? rows[0].id : null;
}

async function getSubordinateTree(pool: any, gestorCollabId: number): Promise<{ id: number, tipo: string, profundidade: number }[]> {
  const chartRes = await pool.query(`SELECT data FROM org_chart_state WHERE id = 1`);
  if (chartRes.rows.length === 0) return [];
  const chartData = typeof chartRes.rows[0].data === 'string' ? JSON.parse(chartRes.rows[0].data) : chartRes.rows[0].data;
  const edges = chartData.edges || [];
  
  const childrenMap: Record<number, number[]> = {};
  for (const edge of edges) {
    const sourceId = parseInt(String(edge.source).replace('node-', ''));
    const targetId = parseInt(String(edge.target).replace('node-', ''));
    if (isNaN(sourceId) || isNaN(targetId)) continue;
    if (!childrenMap[sourceId]) childrenMap[sourceId] = [];
    childrenMap[sourceId].push(targetId);
  }
  
  const result: { id: number, tipo: string, profundidade: number }[] = [];
  const queue: { id: number, depth: number }[] = [];
  const visited = new Set<number>();
  
  const directReports = childrenMap[gestorCollabId] || [];
  for (const childId of directReports) {
    queue.push({ id: childId, depth: 1 });
  }
  
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    result.push({ id, tipo: depth === 1 ? 'direto' : 'indireto', profundidade: depth });
    const children = childrenMap[id] || [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push({ id: childId, depth: depth + 1 });
      }
    }
  }
  
  return result;
}

async function run() {
  const emails = ["jeanchan@grapemidia.com", "adriano@grapemidia.com", "vitor@grapemidia.com", "neri@grapemidia.com"];
  for (const email of emails) {
    const collabId = await resolveCollaboratorId(pool, email);
    if (!collabId) {
      console.log(`Email ${email} has no collaborator record linked.`);
      continue;
    }
    const tree = await getSubordinateTree(pool, collabId);
    console.log(`Email ${email}: collabId=${collabId}, subordinates count=${tree.length}`);
  }
  process.exit(0);
}

run();
