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
          <div className="px-4 py-4 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">{children}</div>
        </main>
      </div>
    </CartProvider>
  );
}
