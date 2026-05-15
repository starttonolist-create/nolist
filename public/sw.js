self.addEventListener(
    "message",
    async (event) => {

        console.log(
            "SW MESSAGE:",
            event.data
        );

        if (
            event.data === "SHOW_NOTIFICATION"
        ) {

            console.log(
                "通知実行"
            );

            await self.registration.showNotification(
                "NoList",
                {
                    body:
                        "SNS見てませんか？",
                    icon: "/icon.png",
                    badge: "/icon.png",
                }
            );

        }

    }
);