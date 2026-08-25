/* Re-mounts on every route change: each page enters with a simple, light fade
   (opacity only — no transform, so fixed overlays keep their positioning). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="dt-page-enter flex flex-1 flex-col">{children}</div>;
}
