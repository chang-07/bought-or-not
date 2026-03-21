import { cookies } from "next/headers";
import PortfolioClient from "./PortfolioClient";

export default async function PortfolioPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionid")?.value;

  let initialPortfolio = { success: false, portfolio: [] };
  let initialSnapshots = [];

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  try {
    const headers = { Cookie: `sessionid=${sessionToken}` };
    const [portRes, histRes] = await Promise.all([
      fetch(`${API_URL}/api/portfolio`, { headers, cache: "no-store" }),
      fetch(`${API_URL}/api/portfolio/history`, { headers, cache: "no-store" }).catch(() => null)
    ]);

    if (portRes.ok) initialPortfolio = await portRes.json();
    if (histRes?.ok) {
      const histData = await histRes.json();
      initialSnapshots = histData.snapshots || [];
    }
  } catch (err) {
    console.error("SSR fetch portfolio failed", err);
  }

  return (
    <PortfolioClient 
      initialPortfolio={initialPortfolio} 
      initialSnapshots={initialSnapshots} 
    />
  );
}
