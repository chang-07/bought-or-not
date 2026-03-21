import { cookies } from "next/headers";
import AuthorClient from "./AuthorClient";

export default async function AuthorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionid")?.value;
  const username = (await params).username;

  let initialProfile = { author: null, pitches: [], error: "" };

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/author/${username}`, {
      headers: {
        Cookie: `sessionid=${sessionToken}`,
      },
      cache: "no-store",
    });
    if (res.ok) {
      initialProfile = await res.json();
    } else {
      initialProfile.error = "Profile fetch failed";
    }
  } catch (err) {
    console.error("SSR fetch author profile failed", err);
    initialProfile.error = "Connection error";
  }

  return <AuthorClient initialProfile={initialProfile} username={username} />;
}
