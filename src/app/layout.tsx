import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "トークスクリプト評価ツール",
  description:
    "サロン・整体店舗スタッフ向け。トークを録音→文字起こし→理想スクリプトと照合して点数化・フィードバックします。",
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
