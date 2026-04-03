import MyPitchesClient from "./MyPitchesClient";

export default async function MyPitchesPage() {
  // With token-based auth, we can't SSR authenticated data (token is in
  // client-side localStorage). Pass null and let MyPitchesClient fetch
  // on mount via its useEffect fallback.
  return <MyPitchesClient initialData={null} />;
}
