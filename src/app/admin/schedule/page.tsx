import { ScheduleManager } from "@/components/admin/schedule-manager";

export const metadata = {
  title: "Розклад | Адмін-панель",
};

export default function SchedulePage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Розклад</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Вручну заблокуйте потрібні години — клієнти не зможуть їх забронювати.
        </p>
      </div>
      <ScheduleManager />
    </div>
  );
}
