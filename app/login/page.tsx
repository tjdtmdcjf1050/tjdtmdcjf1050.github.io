import { getSessionUser } from "../chatgpt-auth";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  return <LoginClient sessionRole={user?.role || null} />;
}
