/**
 * DepositPreauth処理用ユーティリティ
 * 資格情報に基づいてDepositPreauthを設定するための機能を提供
 */
import type { Client, Wallet, SubmittableTransaction, TransactionMetadataBase } from "xrpl";
import type { CredentialService } from "../services/credentialService";
import { hexToString } from "./stringUtils";

// DepositPreauthトランザクションの型定義
interface DepositPreauthTransaction {
  TransactionType: "DepositPreauth";
  Account: string;
  AuthorizeCredentials?: Array<{
    Credential: {
      Issuer: string;
      CredentialType: string;
    };
  }>;
  Authorize?: string;
  [key: string]: unknown; // その他のプロパティ
}

/**
 * 特定のCredential Typeを持つアカウントを検索
 * @param credentialService 資格情報サービス
 * @param credentialType 検索する資格情報タイプ
 */
export async function findCredentialHolders(
  credentialService: CredentialService,
  credentialType: string,
): Promise<string[]> {
  // Issuerが発行したすべてのCredentialを取得
  const credentials = await credentialService.getCredentials();

  // 特定のCredential Typeを持つアカウントをフィルタリング
  const credentialHolders = credentials
    .filter((cred) => cred.credential && hexToString(cred.credential) === credentialType)
    .map((cred) => cred.subject);

  return credentialHolders;
}

/**
 * アカウントのDepositAuth設定を確認・有効化
 * @param client XRPLクライアント
 * @param wallet 対象のウォレット
 */
export async function checkAndEnableDepositAuth(client: Client, wallet: Wallet): Promise<boolean> {
  // アカウント情報の取得
  const accountInfo = await client.request({
    command: "account_info",
    account: wallet.address,
  });

  // DepositAuth設定の確認（0x01000000のビットが立っているか）
  const hasDepositAuth = (accountInfo.result.account_data.Flags & 0x01000000) !== 0;

  // DepositAuthが有効になっていない場合は有効化
  if (!hasDepositAuth) {
    // AccountSetトランザクションを作成してDepositAuthを有効化
    const accountSetTx = {
      TransactionType: "AccountSet",
      Account: wallet.address,
      SetFlag: 9, // 9はlsfDepositAuth（deposit_auth）を有効にするフラグ
    };

    const preparedAccountSet = await client.autofill(
      accountSetTx as unknown as SubmittableTransaction,
    );
    const signedAccountSet = wallet.sign(preparedAccountSet);
    await client.submitAndWait(signedAccountSet.tx_blob);

    return true; // 設定を変更した
  }

  return false; // 既に設定済み
}

/**
 * アカウントに対してDepositPreauthを設定
 * @param client XRPLクライアント
 * @param wallet 承認するウォレット
 * @param authorizedAddress 承認されるアドレス
 */
export async function setupDepositPreauth(
  client: Client,
  wallet: Wallet,
  authorizedAddress: string,
): Promise<{
  address: string;
  hash: string;
  status: string;
}> {
  // DepositPreauthトランザクションを作成
  const depositPreauthTx: DepositPreauthTransaction = {
    TransactionType: "DepositPreauth",
    Account: wallet.address,
    Authorize: authorizedAddress,
  };

  const preparedTx = await client.autofill(depositPreauthTx);
  const signedTx = wallet.sign(preparedTx);
  const txResult = await client.submitAndWait(signedTx.tx_blob);

  return {
    address: authorizedAddress,
    hash: txResult.result.hash,
    status: txResult.result.meta
      ? (txResult.result.meta as TransactionMetadataBase).TransactionResult
      : "unknown",
  };
}

/**
 * アカウントの現在のDepositPreauth設定を取得
 * @param client XRPLクライアント
 * @param address 対象のアドレス
 */
export async function getDepositPreauthList(client: Client, address: string): Promise<string[]> {
  const depositPreauthList = await client.request({
    command: "account_objects",
    account: address,
    type: "deposit_preauth",
  });

  if (
    depositPreauthList.result.account_objects &&
    depositPreauthList.result.account_objects.length > 0
  ) {
    return depositPreauthList.result.account_objects.map((obj: any) => obj.Authorize);
  }

  return [];
}

/**
 * 特定の資格情報タイプに基づいてDepositPreauthを設定
 * issuerとcredentialTypeを指定して、それらの資格情報を持つアカウントとのみ取引可能にする
 * @param client XRPLクライアント
 * @param wallet 承認するウォレット（Verity）
 * @param issuerAddress 資格情報発行者のアドレス
 * @param credentialType 資格情報タイプ（16進数形式）
 */
export async function setupCredentialTypePreauth(
  client: Client,
  wallet: Wallet,
  issuerAddress: string,
  credentialType: string,
): Promise<{
  hash: string;
  status: string;
}> {
  // DepositPreauthトランザクションを作成（AuthorizeCredentialsを使用）
  const depositPreauthTx: DepositPreauthTransaction = {
    TransactionType: "DepositPreauth",
    Account: wallet.address,
    AuthorizeCredentials: [
      {
        Credential: {
          Issuer: issuerAddress,
          CredentialType: credentialType,
        },
      },
    ],
  };

  // トランザクションを準備して送信
  const preparedTx = await client.autofill(depositPreauthTx);
  const signedTx = wallet.sign(preparedTx);
  const txResult = await client.submitAndWait(signedTx.tx_blob);

  return {
    hash: txResult.result.hash,
    status: txResult.result.meta
      ? (txResult.result.meta as TransactionMetadataBase).TransactionResult
      : "unknown",
  };
}

/**
 * 資格情報タイプのDepositPreauth設定を取得
 * @param client XRPLクライアント
 * @param address 対象のアドレス
 */
export async function getCredentialTypePreauths(
  client: Client,
  address: string,
): Promise<{ issuer: string; credentialType: string }[]> {
  const depositPreauthList = await client.request({
    command: "account_objects",
    account: address,
    type: "deposit_preauth",
  });

  if (
    depositPreauthList.result.account_objects &&
    depositPreauthList.result.account_objects.length > 0
  ) {
    return depositPreauthList.result.account_objects
      .filter((obj: any) => obj.AuthorizeCredentials)
      .flatMap((obj: any) => {
        const credentials = obj.AuthorizeCredentials;
        return credentials.map((cred: any) => ({
          issuer: cred.Credential.Issuer,
          credentialType: cred.Credential.CredentialType,
        }));
      });
  }

  return [];
}
