import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "トークスクリプト評価ツール",
  description:
    "サロン・整体店舗スタッフ向け。トークを録音→文字起こし→理想スクリプトと照合して点数化・フィードバックします。",
};

// iPad / スマートフォンでの表示最適化（ズームは許可してアクセシビリティを確保）。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
