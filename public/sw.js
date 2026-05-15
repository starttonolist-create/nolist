self.addEventListener(
    "message",
    (event) => {

        if (
            event.data === "SHOW_NOTIFICATION"
        ) {

            self.registration.showNotification(
                "NoList",
                {
                    body:
                        "SNS見てませんか？",
                    icon: "/icon.png",
                }
            );

        }

    }
);