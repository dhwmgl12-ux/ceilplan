import Sidebar from "@/components/layout/Sidebar";
import CeilingWorkspace from "@/components/ceiling/CeilingWorkspace";

export default function Home() {
  return (
    <div id="dashboard" className="min-h-screen lg:pl-48">
      <Sidebar />
      <CeilingWorkspace />
    </div>
  );
}
