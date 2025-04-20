import { Client, Wallet, type TransactionMetadataBase } from "xrpl";
import dotenv from "dotenv";

// 環境変数の読み込み
dotenv.config();

// 環境変数の型定義
const XRPL_NETWORK = process.env.XRPL_NETWORK || "wss://s.devnet.rippletest.net:51233/";

// Aliceのシード（トランザクション実行に必要）
const ALICE_SEED = process.env.ALICE_SEED;
// 発行者のアドレス
const ISSUER_ADDRESS = process.env.XRPL_ACCOUNT_ADDRESS;
// Credentialのタイプ
const CREDENTIAL_TYPE = process.env.CREDENTIAL_TYPE || "XRPLCommunityExamCertification";

if (!ALICE_SEED || !ISSUER_ADDRESS) {
  console.error("環境変数が正しく設定されていません。以下の環境変数を設定してください:");
  console.error("ALICE_SEED: Aliceのシード（シークレット）");
  console.error("ISSUER_ADDRESS: 発行者のアドレス");
  process.exit(1);
}

if (!CREDENTIAL_TYPE) {
  console.error("CREDENTIAL_TYPE: クレデンシャルタイプが設定されていません");
  process.exit(1);
}

/**
 * 文字列を16進数に変換する
 */
function stringToHex(str: string): string {
  return Buffer.from(str).toString("hex").toUpperCase();
}

// CredentialAcceptトランザクションの型定義
interface CredentialAcceptTransaction {
  TransactionType: "CredentialAccept";
  Account: string;
  Issuer: string;
  CredentialType: string;
  [key: string]: unknown; // その他のプロパティ
}

/**
 * Credentialを受け入れる関数
 * @param seed Aliceのシード
 * @param issuer 発行者のアドレス
 * @param credentialType クレデンシャルのタイプ
 */
async function acceptCredential(
  seed: string,
  issuer: string,
  credentialType: string,
): Promise<string> {
  const client = new Client(XRPL_NETWORK);

  try {
    await client.connect();
    console.log("XRPLネットワークに接続しました");

    const wallet = Wallet.fromSeed(seed);
    console.log(`アカウント: ${wallet.address}`);

    // CredentialAcceptトランザクションの作成
    const tx: CredentialAcceptTransaction = {
      TransactionType: "CredentialAccept",
      Account: wallet.address,
      Issuer: issuer,
      CredentialType: stringToHex(credentialType),
    };

    // トランザクションの送信
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if (typeof result.result.meta === "object" && result.result.meta) {
      const meta = result.result.meta as TransactionMetadataBase;
      if (meta.TransactionResult === "tesSUCCESS") {
        console.log("Credentialを正常に受け入れました");
        return result.result.hash;
      }
      throw new Error(
        `Credentialの受け入れに失敗しました: ${meta.TransactionResult || "不明なエラー"}`,
      );
    }
    throw new Error("トランザクションの結果が不明です");
  } catch (error) {
    console.error("Credentialの受け入れ中にエラーが発生しました:", error);
    throw error;
  } finally {
    await client.disconnect();
  }
}

// メイン処理
async function main() {
  try {
    const txHash = await acceptCredential(
      ALICE_SEED as string,
      ISSUER_ADDRESS as string,
      CREDENTIAL_TYPE as string,
    );
    console.log(`トランザクションハッシュ: ${txHash}`);
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }
}

main();
