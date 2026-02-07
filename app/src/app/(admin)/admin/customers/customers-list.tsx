'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Users, MapPin, Pencil, ChevronRight } from 'lucide-react';
import { CustomerForm } from './customer-form';

interface Pricing {
  id: string;
  price_per_unit: number;
  variant: {
    name: string;
    sku: string | null;
    product: { name: string };
  };
}

interface Customer {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  delivery_instructions: string | null;
  payment_terms: string;
  tax_exempt: boolean;
  is_active: boolean;
  pricing: Pricing[];
}

interface CustomersListProps {
  customers: Customer[];
}

export function CustomersList({ customers }: CustomersListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  function handleCreate() {
    setEditingCustomer(null);
    setFormOpen(true);
  }

  function handleEdit(e: React.MouseEvent, customer: Customer) {
    e.preventDefault();
    e.stopPropagation();
    setEditingCustomer(customer);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground text-sm">{customers.length} restaurant accounts</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {customers.length > 0 ? (
        <div className="space-y-4">
          {customers.map((customer) => (
            <Link key={customer.id} href={`/admin/customers/${customer.id}`}>
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{customer.business_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {customer.contact_name} &middot; {customer.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-normal">
                        {customer.payment_terms?.replace('_', ' ')}
                      </Badge>
                      <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => handleEdit(e, customer)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {customer.address_line1 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground pl-12">
                      <MapPin className="h-3.5 w-3.5" />
                      {customer.address_line1}, {customer.city}, {customer.state} {customer.zip}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {customer.pricing.length} assigned product{customer.pricing.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No customers yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Add your first restaurant account to get started.</p>
          </CardContent>
        </Card>
      )}

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editingCustomer}
      />
    </div>
  );
}
