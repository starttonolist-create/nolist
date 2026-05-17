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
  User,
} from "firebase/auth";

import {
  auth,
  provider,
} from "../lib/firebase";
type Habit = {
  id: string;
  title: string;
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

  const [wasteTime, setWasteTime] =
    useState(0);

  const [failCount, setFailCount] =
    useState(0);

  const [streak, setStreak] =
    useState(5);

  const [successRate, setSuccessRate] =
    useState(82);

  // habits取得
  const fetchHabits = async () => {

    if (!user) return;

    const q = query(
      collection(db, "habits"),
      where("userId", "==", user.uid)
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

    const count =
      todayLogs.length;

    setFailCount(count);

    setWasteTime(count * 20);

    setSuccessRate(
      Math.max(0, 100 - count * 5)
    );

    setStreak(count === 0 ? 1 : 0);
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
  // habit追加
  const addHabit = async () => {

    if (!input || !user)
      return;

    await addDoc(
      collection(db, "habits"),
      {
        title: input,
        userId: user.uid,
      }
    );

    setInput("");

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

      alert("FCM成功・トークン保存完了");
    };
  // fail

  const failHabit = async (
    habitId: string
  ) => {

    if (!user) return;

    await addDoc(
      collection(db, "logs"),
      {
        habitId,
        userId: user.uid,
        createdAt:
          new Date().toISOString(),
      }
    );

    fetchLogs();
  };
  const login = async () => {

    await signInWithPopup(
      auth,
      provider
    );

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

            fetchNotificationLogs(
              currentUser.uid
            );

            fetchNotificationTime(
              currentUser.uid
            );

          }
        }
      );

    return () => unsubscribe();

  }, [user]);

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
              <p className="mb-6 text-gray-400">
                こんにちは、
                {user.displayName}
              </p>
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
            className="
            bg-blue-500
            px-4
            py-2
            rounded-xl
            ml-2
          "
          >

            FCM ON

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

          {/* 入力 */}
          <div className="flex gap-2 mb-6">

            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
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

                  <p>{habit.title}</p>

                  <button
                    onClick={async () => {

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
                  onClick={() =>
                    failHabit(habit.id)
                  }
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
              通知履歴
            </h2>

            <div className="space-y-2">
              {notificationLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-zinc-900 rounded-xl p-3 text-sm"
                >
                  <p>{log.body}</p>
                  <p className="text-gray-500 text-xs">
                    {log.sentAt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    );
}