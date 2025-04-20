import { Client, Wallet, dropsToXrp } from "xrpl";
import * as fs from "fs";
import * as path from "path";

const TESTNET_URL = "wss://s.devnet.rippletest.net:51233/";

async function main() {
	console.log("XRPLテストネットアカウントを作成します...");

	// クライアントの初期化
	const client = new Client(TESTNET_URL);
	await client.connect();

	try {
		// 1. 発行者のウォレットを作成
		console.log("\n1. 発行者アカウントを作成しています...");
		const issuerWallet = await generateFundedWallet(client);

		// ウォレット情報の表示
		console.log("発行者アカウントが作成されました:");
		console.log(`アドレス: ${issuerWallet.address}`);
		console.log(`シークレット: ${issuerWallet.seed}`);

		// 残高の確認
		const issuerBalance = await client.getXrpBalance(issuerWallet.address);
		console.log(`残高: ${issuerBalance} XRP`);

		// 2. 受信者のウォレットを作成
		console.log("\n2. 受信者アカウントを作成しています...");
		const recipientWallet = await generateFundedWallet(client);

		// ウォレット情報の表示
		console.log("受信者アカウントが作成されました:");
		console.log(`アドレス: ${recipientWallet.address}`);
		console.log(`シークレット: ${recipientWallet.seed}`);

		// 残高の確認
		const recipientBalance = await client.getXrpBalance(recipientWallet.address);
		console.log(`残高: ${recipientBalance} XRP`);

		// .envファイルの更新
		if (issuerWallet.seed && recipientWallet.seed) {
			updateEnvFile(
				issuerWallet.address,
				issuerWallet.seed,
				recipientWallet.address,
				recipientWallet.seed
			);
			console.log("\n.envファイルが更新されました。");
			console.log("発行者と受信者の両方のアカウント情報が保存されました。");
		} else {
			console.error(
				"シークレットが取得できませんでした。.envファイルは更新されていません。"
			);
		}
	} catch (error) {
		console.error("エラーが発生しました:", error);
	} finally {
		await client.disconnect();
	}
}

async function generateFundedWallet(client: Client): Promise<Wallet> {
	const { wallet, balance } = await client.fundWallet();
	console.log(`Faucetからの入金額: ${dropsToXrp(balance)} XRP`);
	return wallet;
}

function updateEnvFile(
	issuerAddress: string,
	issuerSecret: string,
	recipientAddress: string,
	recipientSeed: string
) {
	const envPath = path.resolve(process.cwd(), ".env");
	let envContent = "";

	// 既存の.envファイルが存在する場合は読み込む
	if (fs.existsSync(envPath)) {
		envContent = fs.readFileSync(envPath, "utf8");
	}

	// 既存の変数を正規表現で検索して置換
	const addressRegex = /XRPL_ACCOUNT_ADDRESS=".*"/;
	const secretRegex = /XRPL_ACCOUNT_SECRET=".*"/;
	const recipientAddressRegex = /RECIPIENT_ADDRESS=".*"/;
	const recipientSeedRegex = /RECIPIENT_SEED=".*"/;

	// 発行者情報の更新
	if (addressRegex.test(envContent)) {
		envContent = envContent.replace(
			addressRegex,
			`XRPL_ACCOUNT_ADDRESS="${issuerAddress}"`
		);
	} else {
		envContent += `\nXRPL_ACCOUNT_ADDRESS="${issuerAddress}"`;
	}

	if (secretRegex.test(envContent)) {
		envContent = envContent.replace(
			secretRegex,
			`XRPL_ACCOUNT_SECRET="${issuerSecret}"`
		);
	} else {
		envContent += `\nXRPL_ACCOUNT_SECRET="${issuerSecret}"`;
	}

	// 受信者情報の更新
	if (recipientAddressRegex.test(envContent)) {
		envContent = envContent.replace(
			recipientAddressRegex,
			`RECIPIENT_ADDRESS="${recipientAddress}"`
		);
	} else {
		envContent += `\nRECIPIENT_ADDRESS="${recipientAddress}"`;
	}

	if (recipientSeedRegex.test(envContent)) {
		envContent = envContent.replace(
			recipientSeedRegex,
			`RECIPIENT_SEED="${recipientSeed}"`
		);
	} else {
		envContent += `\nRECIPIENT_SEED="${recipientSeed}"`;
	}

	// .envファイルに書き込み
	fs.writeFileSync(envPath, envContent, "utf8");
}

main();
