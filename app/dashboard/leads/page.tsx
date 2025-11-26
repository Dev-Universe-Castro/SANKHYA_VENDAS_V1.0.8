
import DashboardLayout from "@/components/dashboard-layout"
import LeadsKanban from "@/components/leads-kanban"

export default function LeadsPage() {
  return (
    <DashboardLayout hideFloatingMenu={true}>
      <LeadsKanban />
    </DashboardLayout>
  )
}
