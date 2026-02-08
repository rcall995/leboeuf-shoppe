'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, ShoppingCart, ClipboardList, User, Beef } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';

const navItems = [
  { href: '/order', label: 'Home', icon: Home, exact: true },
  { href: '/order/catalog', label: 'Catalog', icon: ShoppingBag },
  { href: '/order/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/order/history', label: 'Orders', icon: ClipboardList },
  { href: '/order/account', label: 'Account', icon: User },
];

export function CustomerNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  const isActive = (item: typeof navItems[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Top header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#2a2a2a] text-white px-4 py-3">
        <Link href="/order" className="flex items-center justify-center gap-2 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">
          <Beef className="h-5 w-5 text-red-500" />
          <h1 className="text-sm font-bold tracking-tight">Le Boeuf Shoppe</h1>
        </Link>
      </header>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="flex items-center justify-around py-1.5 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-w-[56px]',
                isActive(item)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <item.icon className={cn('h-5 w-5', isActive(item) && 'stroke-[2.5]')} />
                {item.href === '/order/cart' && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                    {itemCount}
                  </span>
                )}
              </div>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
