import { AdminDashboard } from "@/components/AdminDashboard";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Blockchain Live Dashboard</h1>
          <p className="text-neutral-400">Real-time visualization of the AnonymousBallot contract on local Hardhat.</p>
        </div>
        
        <AdminDashboard />
      </div>
    </div>
  );
}
