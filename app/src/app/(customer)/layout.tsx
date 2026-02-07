import { CustomerNav } from '@/components/layout/customer-nav';
import { CartProvider } from '@/lib/cart-context';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-background">
        <CustomerNav />
        <main className="pt-14 pb-20">
          <div className="px-4 py-4 max-w-lg mx-auto">{children}</div>
        </main>
      </div>
    </CartProvider>
  );
}
