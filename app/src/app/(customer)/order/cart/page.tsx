import { requireCustomer } from '@/lib/auth';
import { CartView } from './cart-view';

export default async function CartPage() {
  await requireCustomer();
  return <CartView />;
}
