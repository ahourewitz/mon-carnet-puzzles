import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title:"Pièce après pièce · Mon carnet de puzzles",
 description:"Une collection de puzzles, de belles découvertes et le souvenir des dernières pièces posées.",
 icons:{icon:"/favicon.svg"},
};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="fr"><body>{children}</body></html>;
}
