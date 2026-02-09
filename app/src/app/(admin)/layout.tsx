import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { OrderNotifications } from '@/components/admin/order-notifications';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      {/* Main content area - offset for sidebar on desktop, header on mobile */}
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-6">{children}</div>
      </main>
      <OrderNotifications />
    </div>
  );
}
