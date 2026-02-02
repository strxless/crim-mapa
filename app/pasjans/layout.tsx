import '../globals.css';

export default function PasjansLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          header {
            display: none !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            position: fixed !important;
            width: 100vw !important;
            height: 100vh !important;
            top: 0 !important;
            left: 0 !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
          }
        `
      }} />
      {children}
    </>
  );
}
