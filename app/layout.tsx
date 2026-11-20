import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AI Edu Training Hub", template: "%s · AI Edu Training Hub" },
  description: "Khoá học trực tuyến giúp giáo viên hiểu AI, dạy chuyên đề Giáo dục AI và đưa công cụ số vào lớp học.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- tải phông bằng link để build không cần mạng */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
