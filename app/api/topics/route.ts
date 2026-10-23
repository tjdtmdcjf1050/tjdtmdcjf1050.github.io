import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { topics } from "../../../db/schema";
import { apiError } from "../utils";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(topics).orderBy(asc(topics.position), asc(topics.id));
    return Response.json({ topics: rows });
  } catch (error) {
    return apiError(error);
  }
}
