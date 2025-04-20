import { Client, Wallet } from "xrpl";
import dotenv from "dotenv";
import { CredentialService } from "../services/credentialService";

// 環境変数の読み込み
dotenv.config();

// 環境変数の定義
const XRPL_NETWORK =
	process.env.XRPL_NETWORK || "wss://s.devnet.rippletest.net:51233/";
const XRPL_ACCOUNT_ADDRESS = process.env.XRPL_ACCOUNT_ADDRESS;
const XRPL_ACCOUNT_SECRET = process.env.XRPL_ACCOUNT_SECRET;
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS;
const CREDENTIAL_ID = process.env.CREDENTIAL_ID;

if (!XRPL_NETWORK || !XRPL_ACCOUNT_ADDRESS || !XRPL_ACCOUNT_SECRET) {
	throw new Error("環境変数が正しく設定されていません");
}

/**
 * Credential情報を確認する関数
 */
async function viewCredential() {
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

		// 1. 特定のCredential IDが指定されている場合のメッセージ表示
		if (CREDENTIAL_ID) {
			console.log(
				`\n注意: 特定のCredential ID: ${CREDENTIAL_ID}による直接検索はサポートされていません。`,
			);
			console.log("代わりに、発行者および受信者の全Credentialを表示します。");
		}

		// 2. 発行者のすべてのCredential情報を取得
		console.log("\n発行者が発行したCredential一覧:");
		const issuedCredentials = await credentialService.getCredentials();
		console.log(JSON.stringify(issuedCredentials, null, 2));

		// 3. 特定の受信者のCredential情報を取得（指定がある場合）
		if (RECIPIENT_ADDRESS) {
			console.log(`\n受信者(${RECIPIENT_ADDRESS})宛のCredential一覧:`);
			const recipientCredentials =
				await credentialService.getCredentials(RECIPIENT_ADDRESS);
			if (recipientCredentials.length > 0) {
				console.log(JSON.stringify(recipientCredentials, null, 2));
			} else {
				console.log(`指定された受信者宛のCredentialは見つかりませんでした`);
			}
		}
	} catch (error) {
		console.error("エラーが発生しました:", error);
	} finally {
		await client.disconnect();
	}
}

// スクリプト実行
viewCredential();
