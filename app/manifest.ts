import { MetadataRoute } from "next";

export default function manifest():
    MetadataRoute.Manifest {

    return {

        name: "NoList",

        short_name: "NoList",

        description:
            "やることより、やらないこと。",

        start_url: "/",

        display: "standalone",

        background_color: "#000000",

        theme_color: "#000000",

        icons: [
            {
                src: "/icon.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],

    };
}