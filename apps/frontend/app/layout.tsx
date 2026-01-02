import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Providers } from "@/components/providers";
import { NotificationProvider } from "@/hooks/useNotifications";
import { ToastContainer } from "@/components/notifications/ToastContainer";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Reddit Ops Console",
  description: "Premium Reddit scraping console with job orchestration, analytics, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background" suppressHydrationWarning>
        <Providers>
          <NotificationProvider>
            <div className="flex min-h-screen">
              {/* Sidebar */}
              <Sidebar />

              {/* Main Content */}
              <div className="flex-1 ml-[260px]">
                <Topbar />
                <main className="pt-[64px] min-h-screen">
                  <div className="p-6">
                    {children}
                  </div>
                </main>
              </div>
            </div>

            {/* Toast Notifications */}
            <ToastContainer />
            <Toaster />
          </NotificationProvider>
        </Providers>
      </body>
    </html>
  );
}
