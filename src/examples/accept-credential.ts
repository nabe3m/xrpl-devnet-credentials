import { Client, Wallet, SubmittableTransaction } from "xrpl";
import dotenv from "dotenv";

// 環境変数の読み込み
dotenv.config();

// 環境変数の型定義
const XRPL_NETWORK =
	process.env.XRPL_NETWORK || "wss://s.devnet.rippletest.net:51233/";

// 受信者のシード（トランザクション実行に必要）
const RECIPIENT_SEED = process.env.RECIPIENT_SEED;
// Credentialの識別子（レジャー上のCredentialのID）
const CREDENTIAL_ID = process.env.CREDENTIAL_ID;
// 発行者のアドレス
const ISSUER_ADDRESS = process.env.XRPL_ACCOUNT_ADDRESS;
// Credentialのタイプ
const CREDENTIAL_TYPE = "XRPLCommunityExamCertification";

if (!RECIPIENT_SEED || !CREDENTIAL_ID || !ISSUER_ADDRESS) {
	console.error(
		"環境変数が正しく設定されていません。以下の環境変数を設定してください:",
	);
	console.error("RECIPIENT_SEED: 受信者のシード（シークレット）");
	console.error("CREDENTIAL_ID: 受け入れるCredentialのID");
	console.error("XRPL_ACCOUNT_ADDRESS: 発行者のアドレス");
	process.exit(1);
}

/**
 * 文字列を16進数に変換する
 */
function stringToHex(str: string): string {
	return Buffer.from(str).toString("hex").toUpperCase();
}

/**
 * Credentialを受け入れる関数
 * @param seed 受信者のシード
 * @param credentialId 受け入れるCredentialのID
 * @param issuer 発行者のアドレス
 * @param credentialType クレデンシャルのタイプ
 */
async function acceptCredential(
	seed: string,
	credentialId: string,
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
		const tx = {
			TransactionType: "CredentialAccept",
			Account: wallet.address,
			CredentialID: credentialId,
			Issuer: issuer,
			CredentialType: stringToHex(credentialType),
		};

		// トランザクションの送信
		const prepared = await client.autofill(
			tx as unknown as SubmittableTransaction,
		);
		const signed = wallet.sign(prepared);
		const result = await client.submitAndWait(signed.tx_blob);

		if (typeof result.result.meta === "object" && result.result.meta) {
			// TransactionResultを安全に取得
			const txResult = (result.result.meta as any).TransactionResult;
			if (txResult === "tesSUCCESS") {
				console.log("Credentialを正常に受け入れました");
				return result.result.hash;
			} else {
				throw new Error(
					`Credentialの受け入れに失敗しました: ${txResult || "不明なエラー"}`,
				);
			}
		} else {
			throw new Error("トランザクションの結果が不明です");
		}
	} catch (error) {
		console.error("Credentialの受け入れ中にエラーが発生しました:", error);
		throw error;
	} finally {
		await client.disconnect();
	}
}

// メイン処理
async function main() {
	if (!RECIPIENT_SEED || !CREDENTIAL_ID || !ISSUER_ADDRESS) {
		console.error("環境変数が設定されていません");
		process.exit(1);
	}

	try {
		const txHash = await acceptCredential(
			RECIPIENT_SEED,
			CREDENTIAL_ID,
			ISSUER_ADDRESS,
			CREDENTIAL_TYPE,
		);
		console.log(`トランザクションハッシュ: ${txHash}`);
	} catch (error) {
		console.error("エラーが発生しました:", error);
		process.exit(1);
	}
}

main();
