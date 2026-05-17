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

export async function POST(request: Request) {
    const db = admin.firestore();
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
        return NextResponse.json({
            ok: false,
            message: "userIdなし",
        });
    }
    const habitsSnapshot =
        await db
            .collection("habits")
            .where("userId", "==", userId)
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
            userId,
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
    const batch = db.batch();

    result.responses.forEach((response, index) => {
        if (!response.success) {
            const failedToken = tokens[index];

            snapshot.docs.forEach((doc) => {
                if (doc.data().token === failedToken) {
                    batch.delete(doc.ref);
                    deletedTokenCount++;
                }
            });
        }
    });
    let deletedTokenCount = 0;
    await batch.commit();
    await db.collection("notificationLogs").add({
        title: "NoList",
        body: `${randomHabit}見てませんか？`,
        successCount: result.successCount,
        failureCount: result.failureCount,
        sentAt: new Date().toISOString(),
        userId: userId,
    });
    return NextResponse.json({
        ok: true,
        tokenCount: tokens.length,
        successCount: result.successCount,
        failureCount: result.failureCount,
        deletedTokenCount,
        userId,
    });
}

export async function GET() {

    return NextResponse.json({
        ok: false,
        message:
            "GETは未対応",
    });

}