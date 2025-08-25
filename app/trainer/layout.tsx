import SiteFooter from "../components/SiteFooter";
export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (<>
    {children}
    <SiteFooter />
  </>);
}
