
import React, { useEffect } from "react";

export default function Layout({ children }) {
  useEffect(() => {
    // This meta tag helps mobile browsers color the UI elements (like the overscroll area)
    // to match the app's background color, preventing the black background on scroll bounce.
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = '#EFEFEF';
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Lato:wght@400;700&family=Special+Elite&family=Anton&display=swap');
        html, body {
          background-color: #EFEFEF;
        }
        body {
          font-family: 'Lato', sans-serif;
        }
        .font-abril {
          font-family: 'Abril Fatface', serif;
        }
        .font-special-elite {
            font-family: 'Special Elite', cursive;
        }
        .font-anton {
            font-family: 'Anton', sans-serif;
        }
      `}</style>
      <main className="w-full min-h-screen bg-[#EFEFEF]">
        {children}
      </main>
    </>
  );
}
