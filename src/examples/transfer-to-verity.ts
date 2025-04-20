import {
  Client,
  Wallet,
  SubmittableTransaction,
  type Payment,
  type TransactionMetadataBase,
  TxResponse,
} from "xrpl";
import dotenv from "dotenv";
import { getUserConfirmation } from "../utils/inputUtils";

// 環境変数の読み込み
dotenv.config();

// 環境変数の定義
const XRPL_NETWORK = process.env.XRPL_NETWORK || "wss://s.devnet.rippletest.net:51233/";
const ISSUER_ADDRESS = process.env.XRPL_ACCOUNT_ADDRESS; // 資格情報発行者
const VERITY_ADDRESS = process.env.VERITY_ADDRESS; // 送金先（検証者）
const ALICE_ADDRESS = process.env.ALICE_ADDRESS; // 資格情報を持つアカウント
const ALICE_SEED = process.env.ALICE_SEED;
const BOB_ADDRESS = process.env.BOB_ADDRESS; // 資格情報を持たないアカウント
const BOB_SEED = process.env.BOB_SEED;
const CREDENTIAL_ID = process.env.CREDENTIAL_ID; // 資格情報ID

// 入力チェック
if (!XRPL_NETWORK || !VERITY_ADDRESS) {
  throw new Error("環境変数が正しく設定されていません");
}

if (!ALICE_ADDRESS || !ALICE_SEED) {
  throw new Error("AliceのアカウントがENVに設定されていません");
}

if (!BOB_ADDRESS || !BOB_SEED) {
  throw new Error("BobのアカウントがENVに設定されていません");
}

/**
 * XRPを送金する関数
 * @param client XRPLクライアント
 * @param sender 送信者ウォレット
 * @param destination 送金先アドレス
 * @param amount 送金額（XRP）
 * @param credentialIDs 任意の資格情報ID配列
 * @returns トランザクションハッシュまたはエラーメッセージ
 */
async function sendXRP(
  client: Client,
  sender: Wallet,
  destination: string,
  amount: string,
  credentialIDs?: string[],
): Promise<{
  success: boolean;
  from: string;
  to: string;
  amount: string;
  hash?: string;
  fee?: string;
  error?: string;
}> {
  try {
    // Paymentトランザクションの作成
    const payment: Payment = {
      TransactionType: "Payment",
      Account: sender.address,
      Destination: destination,
      Amount: (Number.parseFloat(amount) * 1000000).toString(), // XRPはdropに変換（1 XRP = 1,000,000 drops）
    };

    // 資格情報IDが提供されている場合、トランザクションに追加
    if (credentialIDs && credentialIDs.length > 0) {
      payment.CredentialIDs = credentialIDs;
    }

    // トランザクションを準備して送信
    const prepared = await client.autofill(payment);
    const signed = sender.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    // 結果の確認
    if (
      typeof result.result.meta === "object" &&
      result.result.meta &&
      (result.result.meta as TransactionMetadataBase).TransactionResult === "tesSUCCESS"
    ) {
      console.log(`送金成功: ${sender.address} -> ${destination}, 金額: ${amount} XRP`);
      return {
        success: true,
        from: sender.address,
        to: destination,
        amount: amount,
        hash: result.result.hash,
        fee: prepared.Fee ? (Number.parseInt(prepared.Fee) / 1000000).toString() : "0",
      };
    }

    const errorCode =
      (result.result.meta as TransactionMetadataBase)?.TransactionResult || "不明なエラー";
    return {
      success: false,
      from: sender.address,
      to: destination,
      amount: amount,
      error: errorCode,
      hash: result.result.hash,
      fee: prepared.Fee ? (Number.parseInt(prepared.Fee) / 1000000).toString() : "0",
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("送金エラー:", error.message);
    return {
      success: false,
      from: sender.address,
      to: destination,
      amount: amount,
      error: error.message,
    };
  }
}

/**
 * アカウントからIssuerアドレスに送金するテスト
 */
async function testTransfersToIssuer() {
  // クライアントの初期化
  const client = new Client(XRPL_NETWORK);
  await client.connect();

  try {
    console.log("XRPLネットワークに接続しました");
    console.log(`Verity（受け取り側）: ${VERITY_ADDRESS}`);

    // Aliceのウォレット（資格情報を持つアカウント）
    const aliceWallet = Wallet.fromSeed(ALICE_SEED as string);
    console.log(`\nAlice（送信者、資格情報あり）: ${aliceWallet.address}`);

    // Bobのウォレット（資格情報を持たないアカウント）
    const bobWallet = Wallet.fromSeed(BOB_SEED as string);
    console.log(`Bob（送信者、資格情報なし）: ${bobWallet.address}`);

    // 送金額（XRP）
    const transferAmount = "1.0"; // 1 XRP

    // テスト実行確認
    const confirmed = await getUserConfirmation(
      `\nAliceとBobから${VERITY_ADDRESS}に${transferAmount} XRPの送金テストを実行しますか？ (y/n): `,
    );

    if (!confirmed) {
      console.log("テストをキャンセルしました");
      return;
    }

    // 資格情報IDを取得
    const credentialID = process.env.CREDENTIAL_ID || "";

    // 1. Aliceからの送金テスト（資格情報あり）
    console.log(`\n1. Aliceから${VERITY_ADDRESS as string}に${transferAmount} XRPを送金します...`);
    console.log(`資格情報ID [${credentialID}] を含めます`);
    const aliceResult = await sendXRP(
      client,
      aliceWallet,
      VERITY_ADDRESS as string,
      transferAmount,
      [credentialID],
    );

    if (aliceResult.success) {
      console.log("Aliceからの送金が成功しました！");
      console.log(`トランザクションハッシュ: ${aliceResult.hash}`);
      console.log(`手数料: ${aliceResult.fee} XRP`);
    } else {
      console.log("Aliceからの送金が失敗しました");
      console.log(`エラー: ${aliceResult.error}`);
      if (aliceResult.hash) {
        console.log(`トランザクションハッシュ: ${aliceResult.hash}`);
      }
      if (aliceResult.fee) {
        console.log(`手数料: ${aliceResult.fee} XRP`);
      }
    }

    // 2. Bobからの送金テスト（資格情報なし）
    console.log(`\n2. Bobから${VERITY_ADDRESS as string}に${transferAmount} XRPを送金します...`);
    const bobResult = await sendXRP(client, bobWallet, VERITY_ADDRESS as string, transferAmount);

    if (bobResult.success) {
      console.log("Bobからの送金が成功しました！");
      console.log(`トランザクションハッシュ: ${bobResult.hash}`);
      console.log(`手数料: ${bobResult.fee} XRP`);
    } else {
      console.log("Bobからの送金が失敗しました");
      console.log(`エラー: ${bobResult.error}`);
      if (bobResult.hash) {
        console.log(`トランザクションハッシュ: ${bobResult.hash}`);
      }
      if (bobResult.fee) {
        console.log(`手数料: ${bobResult.fee} XRP`);
      }
    }

    // 3. 結果サマリー
    console.log("\n-------- 送金テスト結果 --------");
    console.log(`Alice（資格情報あり）→ Verity: ${aliceResult.success ? "成功" : "失敗"}`);
    console.log(`Bob（資格情報なし）→ Verity: ${bobResult.success ? "成功" : "失敗"}`);

    if (!aliceResult.success && aliceResult.error === "tecNO_PERMISSION") {
      console.log("\n注意: Aliceの送金が失敗した場合、以下を確認してください：");
      console.log("1. Verityアカウントで'DepositAuth'フラグが有効になっている");
      console.log("2. AliceのアカウントがDepositPreauth設定で承認されている");
    }

    if (!bobResult.success && bobResult.error === "tecNO_PERMISSION") {
      console.log("\nBobの送金失敗は正常です：");
      console.log(
        "資格情報を持たないアカウントからの送金は、DepositPreauthが設定されている場合拒否されます",
      );
      console.log(
        "エラーコード'tecNO_PERMISSION'は、この設定が正しく機能していることを示しています",
      );
    }
  } catch (error) {
    console.error("エラーが発生しました:", error);
  } finally {
    await client.disconnect();
    console.log("\nXRPLネットワークから切断しました");
  }
}

// スクリプト実行
testTransfersToIssuer();
