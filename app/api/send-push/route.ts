import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
}

export async function POST() {
    const db = admin.firestore();
    const habitsSnapshot =
        await db
            .collection("habits")
            .get();

    const habits =
        habitsSnapshot.docs.map(
            (doc) => doc.data().title
        );

    const randomHabit =
        habits[
        Math.floor(
            Math.random() *
            habits.length
        )
        ] || "SNS";
    const userId = "aX1LL09JIRP44poEjDIxzXYEenu2";

    const snapshot = await db
        .collection("fcmTokens")
        .where("userId", "==", userId)
        .get();
    const tokens = snapshot.docs
        .map((doc) => doc.data().token)
        .filter(Boolean);

    if (tokens.length === 0) {
        return NextResponse.json({
            ok: false,
            message: "tokenなし",
        });
    }

    const result = await admin
        .messaging()
        .sendEachForMulticast({
            tokens,
            notification: {
                title: "NoList",
                body:
                    `${randomHabit}見てませんか？`,
            },
            webpush: {
                notification: {
                    icon: "/icon.png",
                },
            },
        });
    await db.collection("notificationLogs").add({
        title: "NoList",
        body: `${randomHabit}見てませんか？`,
        successCount: result.successCount,
        failureCount: result.failureCount,
        sentAt: new Date().toISOString(),
        userId,
    });
    return NextResponse.json({
        ok: true,
        successCount: result.successCount,
        failureCount: result.failureCount,
    });
}

export async function GET() {
    return POST();
}