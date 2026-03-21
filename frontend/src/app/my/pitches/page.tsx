import { cookies } from "next/headers";
import MyPitchesClient from "./MyPitchesClient";

export default async function MyPitchesPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionid")?.value;

  let initialData = null;

  try {
    const res = await fetch("http://127.0.0.1:8000/api/my/pitches", {
      headers: {
        Cookie: `sessionid=${sessionToken}`,
      },
      cache: "no-store",
    });
    if (res.ok) {
      initialData = await res.json();
    }
  } catch (err) {
    console.error("SSR fetch my/pitches failed", err);
  }

  return <MyPitchesClient initialData={initialData} />;
}
