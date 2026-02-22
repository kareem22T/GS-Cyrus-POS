import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabsLayout() {
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ backgroundColor: "#f8fafc", flex: 1, paddingBottom: 10 }}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.light.primary,
          tabBarInactiveTintColor: "#6b7280",
          tabBarStyle: {
            backgroundColor: "#f8fafc",
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            borderBottomWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="pos"
          options={{
            title: "الرئيسية",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            title: "الطلبات",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="fawry-settings"
          options={{
            title: "ربط فوري",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="card" size={size} color={color} />
            ),
          }}
        />

        {/* Replaced branches with products-report */}
        <Tabs.Screen
          name="products-report"
          options={{
            title: "تقرير المنتجات",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: "الإعدادات",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
          }}
        />

        {/* Hidden screens */}
        <Tabs.Screen
          name="branch-selection"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />

        <Tabs.Screen
          name="create-order"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />

        <Tabs.Screen
          name="cart"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />

        <Tabs.Screen
          name="checkout"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />

        <Tabs.Screen
          name="order-details"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />

        <Tabs.Screen
          name="return-order"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
