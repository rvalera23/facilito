import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { APP_PALETTES } from "./constants/palettes";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import AppRefreshWrapper from "@/app/context/AppRefreshWrapper";
import { IvaProvider } from "@/app/context/IvaContext";
// 🔥 IMPORTAR ExchangeRateProvider
import { ExchangeRateProvider } from "@/app/context/ExchangeRateContext";
// 🔥 NUEVO: IMPORTAR ImageProvider
import { ImageProvider } from "@/app/context/ImageContext";
import { NotificationProvider } from "@/app/context/NotificationContext";
import { LocationProvider } from "@/app/context/LocationContext";
import { TenantsProvider } from "@/app/context/TenantsContext";
import { AuthProvider } from "@/app/context/AuthContext";
// 🔥 IMPORTAR UserFontLoader
import UserFontLoader from "@/components/UserFontLoader";
// 🔥 TOAST PROVIDER (global)
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ToastThemeFromDOM } from "@/components/ui/ToastThemeFromDOM";
import ScrollToTopButtonWrapper from "@/components/ScrollToTopButtonWrapper";

// 🔥 CONFIGURAR TODAS LAS FUENTES
// Migrado a next/font/local para no depender de fonts.googleapis.com en build.
// El sistema de fuentes dinámicas por tenant (fontLoader.ts) sigue intacto.
const quicksand = localFont({
  src: [
    { path: "../public/fonts/Quicksand-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Quicksand-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Quicksand-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/Quicksand-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Facilitó",
    default: "facilito — Crea tu negocio virtual en minutos",
  },
  description: "La plataforma SaaS para digitalizar cualquier emprendimiento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="es" 
      className={`
        ${quicksand.variable}
        dark
      `} 
      suppressHydrationWarning
    >
      <body className="font-sans antialiased min-h-screen m-0 p-0 transition-colors duration-200 flex flex-col overflow-x-clip">
                {/* 🔥 CARGAR LA FUENTE DEL USUARIO */}
        <UserFontLoader />
        
        {/* 🔥 TOAST PROVIDER (global, con tema por defecto) */}
        <ToastThemeFromDOM>
          <ToastProvider>
            <ImageProvider>
              <ExchangeRateProvider>
                <IvaProvider>
                  <NotificationProvider>
                    <LocationProvider>
                      <TenantsProvider>
                        <AuthProvider>
                          <AppRefreshWrapper>
                            <div className="w-full flex-grow flex flex-col">
                              {children}
                            </div>
                          </AppRefreshWrapper>
                        </AuthProvider>
                      </TenantsProvider>
                    </LocationProvider>
                  </NotificationProvider>
                </IvaProvider>
              </ExchangeRateProvider>
            </ImageProvider>
          </ToastProvider>
        </ToastThemeFromDOM>
        
{/* 🔥 NUEVO: wrapper cliente para ScrollToTopButton (evita #418) */}
<ScrollToTopButtonWrapper />
      </body>
    </html>
  );
}