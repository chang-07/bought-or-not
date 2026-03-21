import { cookies } from "next/headers";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionid")?.value;

  let initialPitches = [];
  try {
    const res = await fetch("http://127.0.0.1:8000/api/pitches", {
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
