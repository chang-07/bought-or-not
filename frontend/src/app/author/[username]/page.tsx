import AuthorClient from "./AuthorClient";

export default async function AuthorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const username = (await params).username;
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  if (!API_URL) {
    return <AuthorClient initialProfile={{ author: null, pitches: [], error: "NEXT_PUBLIC_API_URL not set" }} username={username} />;
  }

  let initialProfile = { author: null, pitches: [], error: "" };

  try {
    // Author endpoint is auth=None (public), so no token needed for SSR
    const res = await fetch(`${API_URL}/api/author/${username}`, {
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
