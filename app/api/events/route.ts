import { and, asc, eq, gte, like, ne, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { eventApplications, events } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { apiError, parsePositiveId, requireApiUser } from "../utils";

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    const viewerEmail = user?.email || "__anonymous__";
    const url = new URL(request.url);
    const type = String(url.searchParams.get("type") || "");
    const search = String(url.searchParams.get("search") || "")
      .trim()
      .slice(0, 100);
    const page = Math.max(
      1,
      Math.min(1000, Number(url.searchParams.get("page") || 1) || 1),
    );
    const limit = Math.max(
      1,
      Math.min(60, Number(url.searchParams.get("limit") || 12) || 12),
    );
    const conditions = [
      eq(events.status, "approved"),
      gte(events.startsAt, new Date().toISOString()),
    ];
    if (["lecture", "popup", "portfolio"].includes(type))
      conditions.push(eq(events.type, type));
    if (search) {
      const term = `%${search}%`;
      const searchCondition = or(
        like(events.title, term),
        like(events.summary, term),
        like(events.ownerName, term),
        like(events.venue, term),
      );
      if (searchCondition) conditions.push(searchCondition);
    }
    const db = await getDb();
    const where = and(...conditions);
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(where);
    const total = Number(countRow?.count || 0);
    const rows = await db
      .select({
        id: events.id,
        ownerName: events.ownerName,
        type: events.type,
        title: events.title,
        summary: events.summary,
        venue: events.venue,
        startsAt: events.startsAt,
        capacity: events.capacity,
        fee: events.fee,
        status: events.status,
        applicants: sql<number>`(select count(*) from ${eventApplications} where ${eventApplications.eventId}=${events.id} and ${eventApplications.status}!='cancelled')`,
        applied: sql<number>`exists (select 1 from ${eventApplications} where ${eventApplications.eventId}=${events.id} and ${eventApplications.userEmail}=${viewerEmail} and ${eventApplications.status}!='cancelled')`,
      })
      .from(events)
      .where(where)
      .orderBy(asc(events.startsAt))
      .limit(limit)
      .offset((page - 1) * limit);
    return Response.json({
      events: rows,
      total,
      page,
      hasMore: page * limit < total,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const eventId = parsePositiveId(String(body.eventId || ""));
    const action = String(body.action || "apply");
    if (!eventId)
      return Response.json({ error: "행사를 확인해 주세요." }, { status: 400 });
    const db = await getDb();
    const [event] = await db
      .select({
        id: events.id,
        capacity: events.capacity,
        status: events.status,
      })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.status, "approved")))
      .limit(1);
    if (!event)
      return Response.json(
        { error: "신청 가능한 행사를 찾을 수 없습니다." },
        { status: 404 },
      );
    if (action === "cancel") {
      await db
        .update(eventApplications)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(eventApplications.eventId, eventId),
            eq(eventApplications.userEmail, auth.user.email),
          ),
        );
      return Response.json({ applied: false });
    }
    const [count] = await db
      .select({ value: sql<number>`count(*)` })
      .from(eventApplications)
      .where(
        and(
          eq(eventApplications.eventId, eventId),
          ne(eventApplications.status, "cancelled"),
        ),
      );
    if (Number(count?.value || 0) >= event.capacity)
      return Response.json(
        { error: "신청 정원이 마감되었습니다." },
        { status: 409 },
      );
    await db
      .insert(eventApplications)
      .values({
        eventId,
        userEmail: auth.user.email,
        userName: auth.user.displayName,
        message: String(body.message || "")
          .trim()
          .slice(0, 240),
        status: "confirmed",
      })
      .onConflictDoUpdate({
        target: [eventApplications.eventId, eventApplications.userEmail],
        set: {
          status: "confirmed",
          message: String(body.message || "")
            .trim()
            .slice(0, 240),
        },
      });
    return Response.json({ applied: true });
  } catch (error) {
    return apiError(error);
  }
}
