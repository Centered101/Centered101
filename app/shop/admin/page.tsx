"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shop/ui/card";
import AdminLayout from "@/components/shop/admin/AdminLayout";
import ProtectedRoute from "@/components/shop/admin/ProtectedRoute";
import { supabase } from "@/lib/shop/supabase";
import type { ShopOrder } from "@/lib/shop/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faShoppingCart, faBahtSign } from "@fortawesome/free-solid-svg-icons";

const statusColor: Record<string, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
};

function DashboardContent() {
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState<ShopOrder[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from("shop_products").select("id", { count: "exact", head: true }),
        supabase.from("shop_orders").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      setProductCount(productsRes.count || 0);
      const orderData = (ordersRes.data || []) as ShopOrder[];
      setRecentOrders(orderData);
      setOrderCount(orderData.length);
      setRevenue(orderData.reduce((sum, o) => sum + (Number(o.total) || 0), 0));
    };
    fetchStats();
  }, []);

  const stats = [
    { label: "Total Products", value: productCount.toString(), icon: faBox, color: "bg-primary/10 text-primary" },
    { label: "Recent Orders", value: orderCount.toString(), icon: faShoppingCart, color: "bg-success/10 text-success" },
    { label: "Recent Revenue", value: `฿${revenue.toLocaleString()}`, icon: faBahtSign, color: "bg-warning/10 text-warning" },
  ];

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <FontAwesomeIcon icon={stat.icon} />
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Order ID</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium font-mono text-xs">{order.id.slice(0, 8)}</td>
                        <td className="py-3 px-2">{order.customer_name || "—"}</td>
                        <td className="py-3 px-2 font-semibold">฿{Number(order.total).toLocaleString()}</td>
                        <td className="py-3 px-2">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColor[order.status] || "bg-muted text-muted-foreground"}`}>{order.status}</span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AdminLayout>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
