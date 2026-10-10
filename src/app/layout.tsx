import "./globals.css";

export const metadata = { title: "Finova — Personal Finance & Investments" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
