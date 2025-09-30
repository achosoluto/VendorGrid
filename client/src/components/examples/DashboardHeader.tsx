import { DashboardHeader } from "../DashboardHeader";
import { ThemeProvider } from "../ThemeProvider";

export default function DashboardHeaderExample() {
  return (
    <ThemeProvider>
      <div className="bg-background min-h-screen">
        <DashboardHeader userName="John Doe" />
      </div>
    </ThemeProvider>
  );
}
