import { cookies } from "next/headers";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionid")?.value;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  let initialPitches = [];
  try {
    const res = await fetch(`${API_URL}/api/pitches`, {
      headers: {
        Cookie: `sessionid=${sessionToken}`,
      },
      cache: "no-store",
    });
    if (res.ok) {
      initialPitches = await res.json();
    }
  } catch (err) {
    console.error("SSR fetch pitches failed", err);
  }

  return <DashboardClient initialPitches={initialPitches} />;
}
