// Server segment config for /learn/words-to-notes
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function WordsToNotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}