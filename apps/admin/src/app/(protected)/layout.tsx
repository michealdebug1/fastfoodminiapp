import { AppShell } from "@/components/app-shell";
import { RealtimeOrdersProvider } from "@/components/orders/realtime-orders";
import { requireStaffSession } from "@/lib/auth/access";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const staff = await requireStaffSession();

  return (
    <RealtimeOrdersProvider restaurantId={staff.restaurantId}>
      <AppShell
        email={staff.email}
        restaurantName={staff.restaurantName}
        role={staff.role}
      >
        {children}
      </AppShell>
    </RealtimeOrdersProvider>
  );
}
