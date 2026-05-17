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
const getRandomHabitText = async (
    db: FirebaseFirestore.Firestore,
    userId: string
) => {
    const habitsSnapshot = await db
        .collection("habits")
        .where("userId", "==", userId)
        .get();

    const habits = habitsSnapshot.docs.map(
        (doc) => doc.data().title
    );

    const randomHabit =
        habits[
        Math.floor(Math.random() * habits.length)
        ] || "SNS";

    return `${randomHabit}見てませんか？`;
};
export async function POST(request: Request) {
    const db = admin.firestore();
    const now = new Date();

    const jstTime = new Intl.DateTimeFormat(
        "ja-JP",
        {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }
    ).format(now);
    const body = await request.json().catch(() => ({}));
    const userId = body.userId;
    let targetUserIds: string[] = [];

    if (userId) {
        // 手動Push
        targetUserIds = [userId];
    } else {
        // Cron自動Push
        const settingsSnapshot = await db
            .collection("notificationSettings")
            .where("time", "==", jstTime)
            .get();

        targetUserIds = settingsSnapshot.docs.map(
            (doc) => doc.data().userId
        );
    }
    if (targetUserIds.length === 0) {
        return NextResponse.json({
            ok: true,
            message: "対象ユーザーなし",
            jstTime,
        });
    }
    const snapshot = await db
        .collection("fcmTokens")
        .where("userId", "in", targetUserIds.slice(0, 10))
        .get();
    const tokens = snapshot.docs
        .map((doc) => doc.data().token)
        .filter(Boolean);

    if (tokens.length === 0) {
        return NextResponse.json({
            ok: false,
            message: "tokenなし",
            targetUserIds,
            tokenCount: tokens.length,
            userId,
            jstTime,
        });
    }
    let successCount = 0;
    let failureCount = 0;
    let deletedTokenCount = 0;

    const tokensByUser: Record<string, string[]> = {};
    const tokenDocRefsByToken: Record<string, FirebaseFirestore.DocumentReference> = {};

    snapshot.docs.forEach((doc) => {
        const data = doc.data();

        if (!tokensByUser[data.userId]) {
            tokensByUser[data.userId] = [];
        }

        tokensByUser[data.userId].push(data.token);
        tokenDocRefsByToken[data.token] = doc.ref;
    });

    for (const targetUserId of targetUserIds) {
        const userTokens = tokensByUser[targetUserId] || [];

        if (userTokens.length === 0) continue;

        const messageBody = await getRandomHabitText(
            db,
            targetUserId
        );

        const result = await admin.messaging().sendEachForMulticast({
            tokens: userTokens,
            notification: {
                title: "NoList",
                body: messageBody,
            },
            webpush: {
                notification: {
                    icon: "/icon.png",
                },
            },
        });

        successCount += result.successCount;
        failureCount += result.failureCount;

        const batch = db.batch();

        result.responses.forEach((response, index) => {
            if (!response.success) {
                const failedToken = userTokens[index];
                const ref = tokenDocRefsByToken[failedToken];

                if (ref) {
                    batch.delete(ref);
                    deletedTokenCount++;
                }
            }
        });

        await batch.commit();

        await db.collection("notificationLogs").add({
            title: "NoList",
            body: messageBody,
            successCount: result.successCount,
            failureCount: result.failureCount,
            sentAt: new Date().toISOString(),
            userId: targetUserId,
        });
    }
    return NextResponse.json({
        ok: true,
        jstTime,
        targetUserCount: targetUserIds.length,
        successCount,
        failureCount,
    });
}

export async function GET() {
    return POST(
        new Request("https://dummy.local/api/send-push", {
            method: "POST",
            body: JSON.stringify({}),
            headers: {
                "Content-Type": "application/json",
            },
        })
    );
}