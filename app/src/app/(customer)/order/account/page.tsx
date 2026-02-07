import { requireCustomer } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOutButton } from './logout-button';

export default async function AccountPage() {
  const profile = await requireCustomer();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Account</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{profile.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{profile.email}</p>
          </div>
          {profile.phone && (
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{profile.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <LogOutButton />
    </div>
  );
}
