import PortfolioClient from "./PortfolioClient";

export default async function PortfolioPage() {
  // With token-based auth, we can't SSR the portfolio data (token is in
  // client-side localStorage). Pass empty initial data and let the client
  // component fetch on mount via the existing useEffect fallback.
  return (
    <PortfolioClient 
      initialPortfolio={{ success: false, portfolio: [], error: "Loading..." }} 
      initialSnapshots={[]} 
    />
  );
}
