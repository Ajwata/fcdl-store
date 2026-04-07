import { AdminPanel } from "@/components/admin/admin-panel";
import { getCmsContent } from "@/lib/cms-content";

export const metadata = {
  title: "Контент сайту | Адмін",
};

export default async function ContentPage() {
  const cms = await getCmsContent();
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Контент сайту</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Редагуйте тексти, фотографії, новини та посилання
        </p>
      </div>
      <AdminPanel initialContent={cms} />
    </div>
  );
}
