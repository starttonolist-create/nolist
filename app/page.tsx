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

export default function Home() {
  const [input, setInput] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);

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

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          setUser(currentUser);

          if (currentUser) {

            fetchHabits();

            fetchLogs();

          }

        }
      );

    return () => unsubscribe();

  }, [user]);

  const requestNotification =
    async () => {

      const permission =
        await Notification.requestPermission();

      if (
        permission === "granted"
      ) {

        new Notification(
          "NoList",
          {
            body:
              "通知が有効になりました",
          }
        );

        // 30秒後通知
        setTimeout(() => {

          new Notification(
            "NoList",
            {
              body:
                "SNS見てませんか？",
            }
          );

        }, 30000);

      }
    };
  return (
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
        <p className="text-gray-400 mb-8">
          やることより、
          やらないこと。
        </p>

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

      </div>

    </main>
  );
}