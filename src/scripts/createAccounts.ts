import * as fs from "node:fs";
import * as path from "node:path";
import { Client, type Wallet, dropsToXrp } from "xrpl";

const TESTNET_URL = "wss://s.devnet.rippletest.net:51233/";

async function main() {
  console.log("XRPL Devnet アカウントを作成します...");

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

    // 2. Aliceのウォレットを作成
    console.log("\n2. Aliceアカウントを作成しています...");
    const aliceWallet = await generateFundedWallet(client);

    // ウォレット情報の表示
    console.log("Aliceアカウントが作成されました:");
    console.log(`アドレス: ${aliceWallet.address}`);
    console.log(`シークレット: ${aliceWallet.seed}`);

    // 残高の確認
    const aliceBalance = await client.getXrpBalance(aliceWallet.address);
    console.log(`残高: ${aliceBalance} XRP`);

    // 3. Verityの第三者検証者アカウントを作成
    console.log("\n3. Verity(第三者検証者)アカウントを作成しています...");
    const verityWallet = await generateFundedWallet(client);

    // ウォレット情報の表示
    console.log("Verityアカウントが作成されました:");
    console.log(`アドレス: ${verityWallet.address}`);
    console.log(`シークレット: ${verityWallet.seed}`);

    // 残高の確認
    const verityBalance = await client.getXrpBalance(verityWallet.address);
    console.log(`残高: ${verityBalance} XRP`);

    // 4. Bobのアカウントを作成
    console.log("\n4. Bobアカウントを作成しています...");
    const bobWallet = await generateFundedWallet(client);

    // ウォレット情報の表示
    console.log("Bobアカウントが作成されました:");
    console.log(`アドレス: ${bobWallet.address}`);
    console.log(`シークレット: ${bobWallet.seed}`);

    // 残高の確認
    const bobBalance = await client.getXrpBalance(bobWallet.address);
    console.log(`残高: ${bobBalance} XRP`);

    // .envファイルの更新
    if (issuerWallet.seed && aliceWallet.seed && verityWallet.seed && bobWallet.seed) {
      updateEnvFile(
        issuerWallet.address,
        issuerWallet.seed,
        aliceWallet.address,
        aliceWallet.seed,
        verityWallet.address,
        verityWallet.seed,
        bobWallet.address,
        bobWallet.seed,
      );
      console.log("\n.envファイルが更新されました。");
      console.log("全アカウント情報が保存されました。");
    } else {
      console.error("シークレットが取得できませんでした。.envファイルは更新されていません。");
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
  aliceAddress: string,
  aliceSeed: string,
  verityAddress: string,
  veritySeed: string,
  bobAddress: string,
  bobSeed: string,
) {
  const envPath = path.resolve(process.cwd(), ".env");
  let envContent = "";

  // 既存の.envファイルが存在する場合は読み込む
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // 新しいenvコンテンツを作成
  const updatedContent = `# XRPLアカウント情報（発行者）
XRPL_ACCOUNT_ADDRESS="${issuerAddress}"
XRPL_ACCOUNT_SECRET="${issuerSecret}"

# XRPLネットワーク設定（デフォルトはDevnet）
XRPL_NETWORK="wss://s.devnet.rippletest.net:51233/"

# Alice情報（Credentialの対象となるアカウント）
ALICE_ADDRESS="${aliceAddress}"
ALICE_SEED="${aliceSeed}"

# Verity情報（第三者検証者）
VERITY_ADDRESS="${verityAddress}"
VERITY_SEED="${veritySeed}"

# Bob情報（追加アカウント）
BOB_ADDRESS="${bobAddress}"
BOB_SEED="${bobSeed}"

# Credential情報
CREDENTIAL_TYPE="XRPLCommunityExamCertification"

# Credential ID（発行されたトランザクションID - 参照用）
CREDENTIAL_ID=""`;

  // .envファイルに書き込み
  fs.writeFileSync(envPath, updatedContent, "utf8");
}

main();
