// Server segment config for /learn/chords-circle
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function ChordsCircleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // no wrappers needed; we just provide segment config
  return <>{children}</>;
}