import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, FileSpreadsheet, Loader2, Megaphone, Settings, ShieldAlert, ShoppingBag, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ProductsAdmin } from "@/components/admin/ProductsAdmin";
import { BulkImport } from "@/components/admin/BulkImport";
import { MarketingAdmin } from "@/components/admin/MarketingAdmin";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
import { OrdersAdmin } from "@/components/admin/OrdersAdmin";
import { SettingsAdmin } from "@/components/admin/SettingsAdmin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Crompton Trade Hub" },
      { name: "description", content: "Manage products, imports, marketing, users, orders and payments." },
      { property: "og:title", content: "Admin — Crompton Trade Hub" },
      { property: "og:description", content: "Store management dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const TABS = [
  { id: "products", label: "Products", icon: Boxes, el: <ProductsAdmin /> },
  { id: "import", label: "Bulk import", icon: FileSpreadsheet, el: <BulkImport /> },
  { id: "marketing", label: "Marketing", icon: Megaphone, el: <MarketingAdmin /> },
  { id: "users", label: "Users", icon: Users, el: <UsersAdmin /> },
  { id: "orders", label: "Orders", icon: ShoppingBag, el: <OrdersAdmin /> },
  { id: "settings", label: "Settings", icon: Settings, el: <SettingsAdmin /> },
];

function AdminPage() {
  const { ready, role } = useAuth();
  if (!ready) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "admin") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-extrabold">Admins only</h1>
        <p className="text-sm text-muted-foreground">Your account doesn't have access to the dashboard.</p>
        <Button asChild variant="outline"><Link to="/">Back to store</Link></Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
      <h1 className="mb-3 text-xl font-extrabold sm:text-2xl">Admin dashboard</h1>
      <Tabs defaultValue="products">
        <TabsList className="scrollbar-none h-auto w-full justify-start overflow-x-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
              <t.icon className="h-4 w-4" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-4">
            {t.el}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
