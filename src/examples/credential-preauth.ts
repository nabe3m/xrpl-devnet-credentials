import { Client, Wallet } from "xrpl";
import dotenv from "dotenv";
import { stringToHex } from "../utils/stringUtils";
import { getUserConfirmation } from "../utils/inputUtils";
import {
  checkAndEnableDepositAuth,
  setupCredentialTypePreauth,
  getCredentialTypePreauths,
} from "../utils/depositPreauthUtils";

// 環境変数の読み込み
dotenv.config();

// 環境変数の定義
const XRPL_NETWORK = process.env.XRPL_NETWORK || "wss://s.devnet.rippletest.net:51233/";
const ISSUER_ADDRESS = process.env.XRPL_ACCOUNT_ADDRESS; // Issuer
const VERITY_ADDRESS = process.env.VERITY_ADDRESS;
const VERITY_SEED = process.env.VERITY_SEED;
const CREDENTIAL_TYPE = process.env.CREDENTIAL_TYPE || "XRPLCommunityExamCertification";

// 入力チェック
if (!XRPL_NETWORK || !ISSUER_ADDRESS) {
  throw new Error("環境変数が正しく設定されていません");
}

if (!VERITY_ADDRESS || !VERITY_SEED) {
  throw new Error("Verityアカウント情報が設定されていません");
}

/**
 * 資格情報タイプに基づくDepositPreauthの設定関数
 * VerityアカウントがIssuerの特定のCredential Typeを持つアカウントとのみ取引できるように設定
 */
async function setupCredentialTypeDepositPreauth() {
  // クライアントの初期化
  const client = new Client(XRPL_NETWORK);
  await client.connect();

  try {
    console.log("XRPLネットワークに接続しました");

    // Verityのウォレット（第三者検証者）
    const verityWallet = Wallet.fromSeed(VERITY_SEED as string);
    console.log(`Verityアカウント: ${verityWallet.address}`);

    // Issuerのアカウント情報を取得
    console.log(`Issuerアカウント: ${ISSUER_ADDRESS}`);
    console.log(`資格情報タイプ: ${CREDENTIAL_TYPE}`);

    // 資格情報タイプを16進数に変換
    const credentialTypeHex = stringToHex(CREDENTIAL_TYPE);
    console.log(`資格情報タイプ（16進数）: ${credentialTypeHex}`);

    // 1. Depositauthの確認と設定
    console.log("\nVerityアカウントのDepositAuth設定を確認します...");

    const depositAuthEnabled = await checkAndEnableDepositAuth(client, verityWallet);

    if (depositAuthEnabled) {
      console.log("DepositAuth設定が完了しました");
    } else {
      console.log("DepositAuth設定はすでに有効になっています");
    }

    // 2. 設定確認
    const confirmed = await getUserConfirmation(
      `\nVerity(${verityWallet.address})がIssuer(${ISSUER_ADDRESS})の${CREDENTIAL_TYPE}資格情報を持つアカウントとのみ取引できるように設定しますか？ (y/n): `,
    );

    if (!confirmed) {
      console.log("設定をキャンセルしました。");
      return;
    }

    // 3. DepositPreauth設定（AuthorizeCredentials使用）
    console.log("\n資格情報タイプに基づくDepositPreauth設定を開始します...");

    const result = await setupCredentialTypePreauth(
      client,
      verityWallet,
      ISSUER_ADDRESS as string,
      credentialTypeHex,
    );

    console.log(`設定結果: ${result.status === "tesSUCCESS" ? "成功" : "失敗"}`);
    console.log(`トランザクションID: ${result.hash}`);

    // 4. 現在の設定状況を確認
    console.log("\n現在のCredentialタイプDepositPreauth設定を確認します...");

    const authorizedCredentials = await getCredentialTypePreauths(client, verityWallet.address);

    if (authorizedCredentials.length > 0) {
      console.log("Verityアカウントの現在のCredentialベースのDepositPreauth設定:");
      authorizedCredentials.forEach((cred, index) => {
        console.log(`${index + 1}. 発行者: ${cred.issuer}`);
        console.log(`   資格情報タイプ: ${cred.credentialType}`);
      });
    } else {
      console.log("Verityアカウントにはまだ設定されたCredentialベースのDepositPreauthがありません");
    }
  } catch (error) {
    console.error("エラーが発生しました:", error);
  } finally {
    await client.disconnect();
    console.log("\nXRPLネットワークから切断しました");
  }
}

// スクリプト実行
setupCredentialTypeDepositPreauth();
