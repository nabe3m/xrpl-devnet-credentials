import { Client, Wallet } from "xrpl";
import dotenv from "dotenv";
import { CredentialService } from "../services/credentialService";
import readline from "node:readline";

// 環境変数の読み込み
dotenv.config();

// 環境変数の定義
const XRPL_NETWORK = process.env.XRPL_NETWORK || "wss://s.devnet.rippletest.net:51233/";
const XRPL_ACCOUNT_ADDRESS = process.env.XRPL_ACCOUNT_ADDRESS;
const XRPL_ACCOUNT_SECRET = process.env.XRPL_ACCOUNT_SECRET;
const CREDENTIAL_TYPE = process.env.CREDENTIAL_TYPE || "XRPLCommunityExamCertification";
const ALICE_ADDRESS = process.env.ALICE_ADDRESS;

if (!XRPL_NETWORK || !XRPL_ACCOUNT_ADDRESS || !XRPL_ACCOUNT_SECRET) {
  throw new Error("環境変数が正しく設定されていません");
}

if (!CREDENTIAL_TYPE) {
  throw new Error(
    "取り消すCredential Typeが設定されていません。環境変数CREDENTIAL_TYPEを設定してください。",
  );
}

// ユーザー入力を処理するための関数
function getUserConfirmation(question: string): Promise<boolean> {
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

/**
 * Credentialを取り消す（削除する）関数
 */
async function revokeCredential() {
  // クライアントの初期化
  const client = new Client(XRPL_NETWORK);
  await client.connect();

  try {
    console.log("XRPLネットワークに接続しました");

    // 発行者のウォレット
    const issuerWallet = Wallet.fromSeed(XRPL_ACCOUNT_SECRET as string);
    console.log(`発行者のアドレス: ${issuerWallet.address}`);

    // CredentialServiceの初期化
    const credentialService = new CredentialService(client, issuerWallet);

    // 削除前のCredential情報を表示
    console.log("\n現在のCredential一覧:");
    const credentialsBefore = await credentialService.getCredentials();
    console.log(JSON.stringify(credentialsBefore, null, 2));

    // 対象のCredentialを表示
    console.log(`\n取り消し対象: Credential Type = ${CREDENTIAL_TYPE}`);
    if (ALICE_ADDRESS) {
      console.log(`対象の受信者アドレス: ${ALICE_ADDRESS}`);
    }

    // ユーザーに確認
    const confirmed = await getUserConfirmation("\n本当にこのCredentialを取り消しますか？ (y/n): ");

    if (!confirmed) {
      console.log("取り消しをキャンセルしました。");
      return;
    }

    // Credentialの取り消し実行
    console.log("\nCredential取り消しを実行します...");
    const txHash = await credentialService.revokeCredential(CREDENTIAL_TYPE, ALICE_ADDRESS);
    console.log(`取り消し完了！トランザクションID: ${txHash}`);

    // 削除後のCredential情報を表示
    console.log("\n取り消し後のCredential一覧:");
    const credentialsAfter = await credentialService.getCredentials();
    console.log(JSON.stringify(credentialsAfter, null, 2));
  } catch (error) {
    console.error("エラーが発生しました:", error);
  } finally {
    await client.disconnect();
  }
}

// スクリプト実行
revokeCredential();
