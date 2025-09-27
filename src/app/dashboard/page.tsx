import DashboardView from "./components/DashboardView";
import { LeadManager } from "./components/LeadManager";

export default function DashboardPage() {
  return (
    <DashboardView>
      <LeadManager />
    </DashboardView>
  );
}