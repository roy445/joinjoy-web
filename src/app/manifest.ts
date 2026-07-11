import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "揪好咖 JOINJOY",
    short_name: "揪好咖",
    description: "和剛剛好的人一起出發，探索你的下一個美好活動。",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f8",
    theme_color: "#378fa3",
    orientation: "portrait-primary",
    lang: "zh-Hant",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
