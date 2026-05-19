"use client";

import { useEffect, useState } from "react";

import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  setDoc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";

import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";

import {
  auth,
  provider,
} from "../lib/firebase";
type Habit = {
  id: string;
  title: string;
  createdAt?: string;
};
import { getToken, onMessage, } from "firebase/messaging";
import { messaging, } from "../lib/firebase";

export default function Home() {
  const [input, setInput] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [notificationTime, setNotificationTime] = useState("21:00");
  const [notificationLogs, setNotificationLogs] =
    useState<any[]>([]);
  const [fcmEnabled, setFcmEnabled] =
    useState(false);
  const [wasteTime, setWasteTime] =
    useState(0);
  const [editingHabitId, setEditingHabitId] =
    useState<string | null>(null);

  const [editingText, setEditingText] =
    useState("");
  const [failCount, setFailCount] =
    useState(0);

  const [streak, setStreak] =
    useState(5);
  const [todayRanking, setTodayRanking] =
    useState<
      { title: string; count: number }[]
    >([]);
  const [successRate, setSuccessRate] =
    useState(82);
  const [todayFailedHabits, setTodayFailedHabits] =
    useState<any[]>([]);
  // habits取得
  const fetchHabits = async () => {

    if (!user) return;

    const q = query(
      collection(db, "habits"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const snapshot =
      await getDocs(q);

    const data =
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

    setHabits(data);
  };

  // logs取得
  const fetchLogs = async () => {

    if (!user) return;

    const q = query(
      collection(db, "logs"),
      where("userId", "==", user.uid)
    );

    const snapshot =
      await getDocs(q);

    const logs =
      snapshot.docs.map(
        (doc) => doc.data()
      );

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const todayLogs =
      logs.filter(
        (log: any) =>
          String(log.createdAt)
            .startsWith(today)
      );
    setTodayFailedHabits(todayLogs);
    const rankingMap:
      Record<string, number> = {};

    todayLogs.forEach(
      (log: any) => {

        rankingMap[
          log.habitId
        ] =
          (
            rankingMap[
            log.habitId
            ] || 0
          ) + 1;

      }
    );

    const ranking =
      Object.entries(
        rankingMap
      )
        .map(
          ([habitId, count]) => ({
            title:
              habits.find(
                (habit) =>
                  habit.id === habitId
              )?.title
              || "不明",
            count:
              count as number,
          })
        )
        .sort(
          (a, b) =>
            b.count -
            a.count
        );

    setTodayRanking(
      ranking
    );
    const count =
      todayLogs.length;

    console.log(
      "今日の失敗ログ",
      todayLogs
    );
    setFailCount(count);

    setWasteTime(count * 20);

    const totalLogs =
      logs.length;

    const rate =
      Math.max(
        0,
        100 - totalLogs * 2
      );

    setSuccessRate(rate);
    const todaySuccess =
      todayLogs.length === 0;

    if (todaySuccess) {
      setSuccessRate(100);
    }
    const hasFailedToday =
      todayLogs.length > 0;

    setStreak(
      hasFailedToday ? 0 : 1
    );
  };
  const fetchNotificationLogs = async (
    uid?: string) => {
    const targetUid = uid || user?.uid;

    if (!targetUid) return;

    const q = query(
      collection(db, "notificationLogs"),
      where("userId", "==", targetUid)
    );

    const snapshot = await getDocs(q);

    const data = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: any, b: any) =>
        String(b.sentAt).localeCompare(String(a.sentAt))
      )
      .slice(0, 5);

    setNotificationLogs(data);
  };
  const fetchNotificationTime =
    async (uid?: string) => {

      const targetUid =
        uid || user?.uid;

      if (!targetUid) return;

      const snapshot =
        await getDoc(
          doc(
            db,
            "notificationSettings",
            targetUid
          )
        );

      if (snapshot.exists()) {

        const data =
          snapshot.data();

        if (data.time) {
          setNotificationTime(
            data.time
          );
        }

      }

    };
  const fetchFcmStatus =
    async (uid?: string) => {

      const targetUid =
        uid || user?.uid;

      if (!targetUid) return;

      const snapshot =
        await getDoc(
          doc(
            db,
            "fcmTokens",
            targetUid
          )
        );

      setFcmEnabled(
        snapshot.exists()
      );

    };
  // habit追加
  const addHabit = async () => {

    const title =
      input.trim();

    if (!title || !user)
      return;
    if (habits.length >= 10) {
      alert(
        "やらないことは10個までです"
      );
      return;
    }
    const normalize = (text: string) =>
      text
        .trim()
        .replace(/\s+/g, "")
        .toLowerCase();

    const exists =
      habits.some(
        (habit) =>
          normalize(habit.title) ===
          normalize(title)
      );
    if (exists) {
      alert(
        "同じやらないことがあります"
      );
      return;
    }
    await addDoc(
      collection(db, "habits"),
      {
        title,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      }
    );
    setInput("");

    fetchHabits();
  };
  const updateHabit =
    async (
      habitId: string
    ) => {

      const title =
        editingText.trim();

      if (!title) return;
      const normalize =
        (text: string) =>
          text
            .trim()
            .replace(/\s+/g, "")
            .toLowerCase();

      const exists =
        habits.some(
          (habit) =>
            habit.id !== habitId &&
            normalize(
              habit.title
            ) ===
            normalize(title)
        );

      if (exists) {
        alert(
          "同じやらないことがあります"
        );
        return;
      }
      await setDoc(
        doc(
          db,
          "habits",
          habitId
        ),
        {
          title,
          userId:
            user?.uid,
          createdAt:
            new Date()
              .toISOString(),
        },
        {
          merge: true,
        }
      );

      setEditingHabitId(
        null
      );

      setEditingText("");

      fetchHabits();
    };
  const enableFCM =
    async () => {

      if (!messaging) {

        alert(
          "Messaging未対応"
        );

        return;
      }

      const permission =
        await Notification
          .requestPermission();

      if (
        permission !== "granted"
      ) {

        alert("通知拒否");

        return;
      }

      // FCM専用SW登録
      const registration =
        await navigator
          .serviceWorker
          .register(
            "/firebase-messaging-sw.js",
            {
              scope:
                "/firebase-cloud-messaging-push-scope",
            }
          );

      console.log(
        "FCM SW",
        registration.active?.scriptURL
      );

      // token取得
      const token =
        await getToken(
          messaging,
          {
            vapidKey:
              "BO0W8pyLZklP6Qv01317gX0Wd8GPEXQf4DxhV-d-KwT2cCg2OopD2-03ABPF1-xN1EMaLZVpfttjb7-loKoBKOQ",

            serviceWorkerRegistration:
              registration,
          }
        );
      if (!token) {

        alert("TOKENなし");

        return;
      }

      console.log(token);
      if (!user) {
        alert("ログインしてください");
        return;
      }

      await setDoc(
        doc(db, "fcmTokens", user.uid),
        {
          userId: user.uid,
          token,
          updatedAt: new Date().toISOString(),
        }
      );
      prompt(
        "FCM TOKEN",
        token
      );
      setFcmEnabled(true);
      alert("FCM成功・トークン保存完了");
    };
  // fail

  const failHabit = async (
    habitId: string
  ) => {

    if (!user) return;

    if (!user) return;

    // 先にUI更新
    setFailCount((prev) => prev + 1);

    setWasteTime((prev) =>
      prev + 20
    );

    setSuccessRate((prev) =>
      Math.max(0, prev - 5)
    );

    // DB保存
    await addDoc(
      collection(db, "logs"),
      {
        habitId,
        userId: user.uid,
        createdAt:
          new Date().toISOString(),
      }
    );

    // 最終同期
    fetchLogs();
  };
  const login = async () => {

    await signInWithPopup(
      auth,
      provider
    );

  };

  const logout = async () => {
    await signOut(auth);
  };
  const sendPush = async () => {
    if (!user) {
      alert("ログインしてください");
      return;
    }

    const res = await fetch("/api/send-push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.uid,
      }),
    });

    const data = await res.json();

    console.log(data);

    alert(
      JSON.stringify(
        data,
        null,
        2
      )
    );
  };
  const saveNotificationTime = async () => {
    if (!user) {
      alert("ログインしてください");
      return;
    }

    try {
      await setDoc(
        doc(db, "notificationSettings", user.uid),
        {
          userId: user.uid,
          time: notificationTime,
          updatedAt: new Date().toISOString(),
        }
      );

      alert("通知時間を保存しました");
    } catch (error) {
      console.error(error);
      alert("通知時間の保存に失敗しました");
    }
  };
  useEffect(() => {
    const setupForegroundMessage = async () => {
      if (!messaging) {
        console.log("messaging未準備");
        return;
      }

      const unsubscribe = onMessage(
        messaging,
        (payload) => {
          console.log("前面FCM受信", payload);

          alert(
            payload.notification?.body ||
            "通知を受信しました"
          );
          fetchNotificationLogs();
        }
      );

      return unsubscribe;
    };

    setupForegroundMessage();
  }, []);
  useEffect(() => {

    const interval =
      setInterval(async () => {

        const now =
          new Date();

        const hour =
          now.getHours();

        const minute =
          now.getMinutes();

        // 21:00 に通知
        if (
          hour === 21 &&
          minute === 30
        ) {

          const registration =
            await navigator
              .serviceWorker
              .ready;

          registration.showNotification(
            "NoList",
            {
              body:
                "SNS見てませんか？ばれていますよ",
              icon: "/icon.png",
              badge: "/icon.png",
            }
          );

        }

      }, 60000);

    return () =>
      clearInterval(interval);

  }, []);
  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          setUser(currentUser);

          if (currentUser) {
            fetchHabits();
            fetchLogs();
            fetchNotificationLogs(currentUser.uid);
            fetchNotificationTime(currentUser.uid);
            fetchFcmStatus(currentUser.uid);
          } else {
            setHabits([]);
            setNotificationLogs([]);
            setFcmEnabled(false);
            setWasteTime(0);
            setFailCount(0);
            setStreak(0);
            setSuccessRate(0);
            setNotificationTime("21:00");
          }
        }
      );

    return () => unsubscribe();

  }, [user]);
  const formatDateTime = (value: string) => {
    return new Date(value).toLocaleString(
      "ja-JP",
      {
        timeZone: "Asia/Tokyo",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };
  const requestNotification =
    async () => {

      if (
        !("Notification" in window)
      ) {

        alert(
          "通知未対応"
        );

        return;
      }

      const permission =
        await Notification.requestPermission();

      if (
        permission !== "granted"
      ) {

        alert(
          "通知拒否"
        );

        return;
      }

      // Service Worker取得
      const registration =
        await navigator
          .serviceWorker
          .ready;

      // 即通知
      registration.showNotification(
        "NoList",
        {
          body:
            "通知が有効になりました",
          icon: "/icon.png",
          badge: "/icon.png",
        }
      );

      // 5秒後通知
      setTimeout(async () => {

        registration.showNotification(
          "NoList",
          {
            body:
              "SNS見てませんか？",
            icon: "/icon.png",
            badge: "/icon.png",
          }
        );

      }, 5000);
    }; return (
      <main className="min-h-screen bg-black text-white p-6">

        <div className="max-w-md mx-auto">

          <h1 className="text-4xl font-bold mb-2">
            NoList
          </h1>
          {
            user ? (
              <div className="mb-6">
                <p className="text-gray-400">
                  こんにちは、
                  {user.displayName}
                </p>

                <button
                  onClick={logout}
                  className="
                    mt-2
                    text-sm
                    text-gray-400
                    underline
                  "
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="
                bg-white
                text-black
                px-4
                py-2
                rounded-xl
                mb-6
                font-bold
              "
              >
                Googleでログイン
              </button>

            )
          }
          <button
            onClick={requestNotification}
            className="
          bg-zinc-800
          px-4  
          py-2
          rounded-xl
          mb-6
          ml-2
        "
          >
            🔔 通知ON
          </button>
          <button
            onClick={enableFCM}
            className={`
              px-4
              py-2
              rounded-xl
              ml-2
              ${fcmEnabled
                ? "bg-green-600"
                : "bg-blue-500"
              }
            `}
          > {fcmEnabled
            ? "✅ 通知ON済み"
            : "FCM ON"}

          </button>

          <p className="text-gray-400 mb-8">
            やることより、
            やらないこと。
          </p>
          <div className="mt-4 flex gap-2 items-center">
            <input
              type="time"
              value={notificationTime}
              onChange={(e) =>
                setNotificationTime(e.target.value)
              }
              className="
                bg-zinc-900
                text-white
                px-4
                py-2
                rounded-xl
              "
            />

            <button
              onClick={saveNotificationTime}
              className="
                bg-purple-500
                px-4
                py-2
                rounded-xl
              "
            >
              通知時間保存
            </button>
          </div>
          {/* 統計 */}
          <div className="grid grid-cols-2 gap-3 mb-6">

            <div className="bg-zinc-900 p-4 rounded-2xl">
              <p className="text-gray-400 text-sm">
                無駄時間
              </p>

              <h2 className="text-3xl font-bold">
                {wasteTime}分
              </h2>
            </div>

            <div className="bg-zinc-900 p-4 rounded-2xl">
              <p className="text-gray-400 text-sm">
                失敗回数
              </p>

              <h2 className="text-3xl font-bold">
                {failCount}回
              </h2>
            </div>

            <div className="bg-zinc-900 p-4 rounded-2xl">
              <p className="text-gray-400 text-sm">
                ストリーク
              </p>

              <h2 className="text-3xl font-bold">
                🔥 {streak}日
              </h2>
            </div>

            <div className="bg-zinc-900 p-4 rounded-2xl">
              <p className="text-gray-400 text-sm">
                達成率
              </p>

              <h2 className="text-3xl font-bold">
                {successRate}%
              </h2>
            </div>

          </div>
          <div
            className={`
              mb-6
              rounded-2xl
              p-4
              text-center
              font-bold
              ${failCount === 0
                ? "bg-green-900"
                : "bg-red-900"
              }
              `}
          >
            {failCount === 0
              ? "🔥 今日守れている"
              : `⚠️ 今日 ${failCount}回破った`}
          </div>
          <p className="text-gray-500 text-sm mb-2">
            登録数: {habits.length}/10
          </p>
          {/* 入力 */}
          <div className="flex gap-2 mb-6">

            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addHabit();
                }
              }}
              placeholder="やらないこと"
              className="
              flex-1
              bg-zinc-900
              rounded-xl
              px-4
              py-3
              outline-none
            "
            />

            <button
              onClick={addHabit}
              className="
              bg-white
              text-black
              px-4
              rounded-xl
              font-bold
            "
            >
              追加
            </button>

          </div>

          {/* habits */}
          <div className="space-y-3">

            {habits.map((habit) => (

              <div
                key={habit.id}
                className="
                bg-zinc-900
                rounded-2xl
                p-4
                flex
                items-center
                justify-between
              "
              >

                <div className="flex items-center gap-2">

                  {editingHabitId ===
                    habit.id ? (

                    <input
                      value={editingText}
                      onChange={(e) =>
                        setEditingText(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateHabit(habit.id);
                        }
                      }}
                      className="
        bg-zinc-800
        rounded
        px-2
        py-1
        text-sm
      "
                    />

                  ) : (

                    <p>
                      {habit.title}
                    </p>

                  )}

                  {editingHabitId ===
                    habit.id && (
                      <button
                        onClick={() =>
                          updateHabit(
                            habit.id
                          )
                        }
                        className="
        text-xs
        text-green-400
      "
                      >
                        保存
                      </button>
                    )}
                  {editingHabitId ===
                    habit.id && (
                      <button
                        onClick={() => {
                          setEditingHabitId(null);
                          setEditingText("");
                        }}
                        className="
      text-xs
      text-gray-500
    "
                      >
                        キャンセル
                      </button>
                    )}
                  {editingHabitId !==
                    habit.id && (
                      <button
                        onClick={() => {

                          setEditingHabitId(
                            habit.id
                          );

                          setEditingText(
                            habit.title
                          );

                        }}
                        className="
      text-xs
      text-blue-400
    "
                      >
                        編集
                      </button>
                    )}
                  <button
                    onClick={async () => {

                      await setDoc(
                        doc(
                          db,
                          "habits",
                          habit.id
                        ),
                        {
                          createdAt:
                            new Date()
                              .toISOString(),
                        },
                        {
                          merge: true,
                        }
                      );

                      fetchHabits();

                    }}
                    className="
    text-xs
    text-yellow-400
  "
                  >
                    ↑
                  </button>
                  <button
                    onClick={async () => {

                      const ok =
                        confirm(
                          "本当に削除しますか？"
                        );

                      if (!ok) return;

                      await deleteDoc(
                        doc(db, "habits", habit.id)
                      );

                      fetchHabits();

                    }}
                    className="
      text-xs
      text-gray-400
    "
                  >
                    削除
                  </button>

                </div>

                <button
                  onClick={() => {
                    const ok = confirm(
                      "本当に破った記録を追加しますか？"
                    );

                    if (!ok) return;

                    failHabit(habit.id);
                  }}
                  className="
                  bg-red-500
                  px-4
                  py-2
                  rounded-xl
                  font-bold
                "
                >
                  破った
                </button>

              </div>

            ))}

          </div>
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">
              今日の誘惑ランキング
            </h2>

            <div className="space-y-2">
              {todayRanking.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  今日はまだ破っていません。いい感じです。
                </p>
              ) : (
                todayRanking.map(
                  (item, index) => (<div
                    key={index}
                    className="bg-zinc-900 rounded-xl p-3 flex justify-between"
                  >
                    <p>
                      {index + 1}位
                      {item.title}
                    </p>

                    <p>
                      {item.count}回
                    </p>
                  </div>
                  )
                )
              )}
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">
              今日破った記録
            </h2>

            <div className="space-y-2">
              {todayFailedHabits.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  記録なし。今日は守れています。
                </p>
              ) : (
                todayFailedHabits.map((log, index) => (
                  <div
                    key={index}
                    className="bg-zinc-900 rounded-xl p-3 text-sm"
                  >
                    <p>
                      {
                        habits.find(
                          (habit) =>
                            habit.id === log.habitId
                        )?.title
                        || "不明"
                      }
                    </p>                  <p className="text-gray-500 text-xs">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">
              通知履歴
            </h2>

            <div className="space-y-2">
              {notificationLogs.map((log) => (
                <div
                  key={log.id}
                  className="
                    bg-zinc-900
                    rounded-xl
                    p-4
                    border
                    border-zinc-800
                  "
                >
                  <div className="flex justify-between items-start">

                    <div>
                      <p className="font-bold">
                        📣 通知
                      </p>

                      <p className="text-sm mt-1">
                        {log.body}
                      </p>
                    </div>

                    <p className="text-gray-500 text-xs">
                      {formatDateTime(
                        log.sentAt
                      )}
                    </p>

                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    );
}