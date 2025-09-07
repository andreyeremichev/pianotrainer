// Server segment config for /learn/numbers-circle
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function NumbersCircleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}