import { Client, Wallet } from "xrpl";
import dotenv from "dotenv";
import { CredentialService } from "../services/credentialService";
import * as fs from "node:fs";
import * as path from "node:path";
import { CredentialRequest } from "../types/credential";

// 環境変数の読み込み
dotenv.config();

// 環境変数の型定義
const XRPL_NETWORK =
	process.env.XRPL_NETWORK || "wss://s.devnet.rippletest.net:51233/";
const XRPL_ACCOUNT_ADDRESS = process.env.XRPL_ACCOUNT_ADDRESS;
const XRPL_ACCOUNT_SECRET = process.env.XRPL_ACCOUNT_SECRET;
const ALICE_ADDRESS = process.env.ALICE_ADDRESS;
const ALICE_SEED = process.env.ALICE_SEED;

if (!XRPL_NETWORK || !XRPL_ACCOUNT_ADDRESS || !XRPL_ACCOUNT_SECRET) {
	throw new Error("必要な環境変数が設定されていません");
}

if (!ALICE_ADDRESS || !ALICE_SEED) {
	throw new Error(
		"Aliceの環境変数が設定されていません。ALICE_ADDRESSとALICE_SEEDを設定してください",
	);
}

/**
 * XRPLコミュニティ検定シナリオ
 *
 * 1. 認定機関がXRPLコミュニティ検定をCredentialとして発行
 * 2. Aliceがクレデンシャルを受け取る
 * 3. Aliceのクレデンシャル情報を表示
 */
async function runXRPLCommunityExamScenario() {
	// クライアントの初期化
	const client = new Client(XRPL_NETWORK);
	await client.connect();

	try {
		console.log("XRPLネットワークに接続しました");

		// 認定機関のウォレット（発行者）
		if (!XRPL_ACCOUNT_SECRET) {
			throw new Error("イシュアーアカウントのシークレットが設定されていません");
		}

		const issuerWallet = Wallet.fromSeed(XRPL_ACCOUNT_SECRET);
		console.log(`認定機関のアドレス: ${issuerWallet.address}`);

		// Aliceのウォレットを環境変数から読み込む
		const aliceWallet = Wallet.fromSeed(ALICE_SEED as string);
		console.log(`Aliceのアドレス: ${aliceWallet.address}`);

		// CredentialServiceの初期化
		const credentialService = new CredentialService(client, issuerWallet);

		// 1. XRPLコミュニティ検定を発行
		console.log("\n1. XRPLコミュニティ検定を発行します...");

		// 有効期限を1年後に設定（Ripple時間形式ではなく、ISO文字列形式で渡す）
		const expirationDate = new Date(
			Date.now() + 365 * 24 * 60 * 60 * 1000,
		).toISOString();

		// 今日の日付を取得してフォーマット (YYYY-MM-DD)
		const today = new Date();
		const dateFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

		// ランダムな5桁の数字を生成
		const randomId = Math.floor(10000 + Math.random() * 90000);

		// 証明書IDを今日の日付で生成
		const certificationId = `XRPL-COMM-${dateFormatted}-${randomId}`;

		// 証明書のメタデータをJSONとして作成
		const certificateData = JSON.stringify({
			reason:
				"This person has completed the XRPL Community Exam, please issue credential",
			name: "Taro Yamada",
			certificationId: certificationId,
			examScore: 92,
			issueDate: today.toISOString(),
		});

		const credentialRequest = {
			subject: aliceWallet.address, // Aliceのアドレス
			credential:
				process.env.CREDENTIAL_TYPE || "XRPLCommunityExamCertification", // 資格証明タイプ
			memo: {
				data: certificateData,
				type: "application/json", // メモのタイプ
				format: "text/plain", // メモのフォーマット
			},
			expiration: expirationDate,
			uri: `https://xrpl-community.example.com/credentials/${certificationId}`,
		};

		const credentialId =
			await credentialService.issueCredential(credentialRequest);
		console.log(
			`XRPLコミュニティ検定証明書を発行しました。\nCredential ID: ${credentialId}`,
		);

		// .envファイルにCredentialIDを追加
		try {
			const envPath = path.resolve(process.cwd(), ".env");
			let envContent = "";

			// 既存の.envファイルを読み込む
			if (fs.existsSync(envPath)) {
				envContent = fs.readFileSync(envPath, "utf8");
			}

			// CREDENTIAL_IDが既に存在するか確認
			if (envContent.includes("CREDENTIAL_ID=")) {
				// CREDENTIAL_IDを更新
				envContent = envContent.replace(
					/CREDENTIAL_ID=.*/g,
					`CREDENTIAL_ID=${credentialId}`,
				);
			} else {
				// CREDENTIAL_IDを追加
				envContent += `\nCREDENTIAL_ID=${credentialId}`;
			}

			// .envファイルに書き込む
			fs.writeFileSync(envPath, envContent);
			console.log(".envファイルにCREDENTIAL_IDを保存しました");
		} catch (error) {
			console.error(".envファイルの更新中にエラーが発生しました:", error);
		}

		// 2. Aliceが自分のCredentialを確認
		console.log("\n2. Aliceが自分のCredentialを確認します...");
		// 自分宛のCredentialをチェック
		const myCredentials = await credentialService.getCredentials(
			aliceWallet.address,
		);
		console.log("Alice宛のCredential一覧:");
		console.log(JSON.stringify(myCredentials, null, 2));

		// 3. 認定機関が発行したCredential一覧を確認
		console.log("\n3. 認定機関が発行したCredential一覧を確認します...");
		const issuedCredentials = await credentialService.getCredentials();
		console.log("発行済みCredential一覧:");
		console.log(JSON.stringify(issuedCredentials, null, 2));

		console.log("\nシナリオ実行完了");
	} catch (error) {
		console.error("エラーが発生しました:", error);
	} finally {
		await client.disconnect();
	}
}

// シナリオ実行
runXRPLCommunityExamScenario();
