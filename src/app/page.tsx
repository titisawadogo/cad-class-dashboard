import Dashboard from "./components/Dashboard";
import studentsData from "./data/students.json";
import type { DashboardData } from "./types";

export default function Home() {
  return <Dashboard data={studentsData as DashboardData} />;
}
