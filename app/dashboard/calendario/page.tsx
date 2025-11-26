
import DashboardLayout from "@/components/dashboard-layout"
import CalendarioView from "@/components/calendario-view"

export default function CalendarioPage() {
  return (
    <DashboardLayout hideFloatingMenu={true}>
      <div className="h-[calc(100vh-theme(spacing.32))] pb-20 lg:pb-4">
        <CalendarioView />
      </div>
    </DashboardLayout>
  )
}
