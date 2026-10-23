import AdminClient from "./AdminClient";
import { isAdmin } from "../admin-auth";
export const dynamic = "force-dynamic";
export default async function AdminPage() { return <AdminClient initialAdmin={await isAdmin()} />; }
