import dotenv from "dotenv";
import { Client } from "xrpl";

dotenv.config();

// 環境変数の型定義
const XRPL_NETWORK = process.env.XRPL_NETWORK;
if (!XRPL_NETWORK) {
  throw new Error("XRPL_NETWORK環境変数が設定されていません");
}

const main = async () => {
  try {
    // クライアントの初期化
    const client = new Client(XRPL_NETWORK);
    await client.connect();

    console.log("XRPLネットワークに接続しました");

    // ここにCredentials機能の実装を追加していきます

    await client.disconnect();
  } catch (error) {
    console.error("エラーが発生しました:", error);
  }
};

main();
