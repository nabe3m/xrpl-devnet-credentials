/**
 * ユーザー入力処理用ユーティリティ
 */
import readline from "node:readline";

/**
 * ユーザーに確認を求め、Yes/Noの回答を受け取る
 * @param question 質問文
 * @returns Yesの場合true、Noの場合false
 */
export function getUserConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}
