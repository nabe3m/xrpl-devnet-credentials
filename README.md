# XRPL Credentials サンプル

このプロジェクトは、XRPLのDevnet環境でCredentials機能を試すためのサンプル実装です。

Credentials機能は、XRPLにおいてブロックチェーン上で証明書や資格情報を発行・管理するための機能を提供します。

## セットアップ

1. リポジトリのクローンとディレクトリの移動:
```bash
git clone https://github.com/nabe3m/xrpl-devnet-credentials.git
cd xrpl-devnet-credentials
```

2. 依存関係のインストール:
```bash
npm install
```

## 実行フロー

このプロジェクトは6つの主要なスクリプトによって構成されており、以下の順序で実行することを推奨します：

### 1. アカウントの作成 (createAccounts.ts)

Devnet上に4つのXRPLアカウントを作成し、`.env`ファイルを自動的に更新します:

```bash
npm run create-accounts
```

実行結果:
- 発行者（Issuer）アカウント: 資格情報を発行するアカウント
- Alice: 資格情報を受け取るアカウント
- Verity: 第三者検証者（DepositAuth利用）アカウント
- Bob: 資格情報を持たないサンプルアカウント
- 各アカウントにDevnetフォーセットから自動的にXRPが入金されます
- `.env`ファイルが新規作成され、全てのアカウント情報が保存されます

### 2. 資格情報の発行 (issue-credential.ts)

発行者アカウントからAliceへ資格情報を発行します:

```bash
npm run issue-credential
```

実行結果:
- 発行者からAliceに「XRPLCommunityExamCertification」資格情報が発行されます
- 有効期限、証明書ID、詳細情報などのメタデータが設定されます
- 資格情報のレジャーエントリIDが表示され、`.env`ファイルのCREDENTIAL_ID変数に自動保存されます
- 発行したCredentialの情報が表示されます

### 3. 資格情報の受け入れ (accept-credential.ts)

Aliceが発行された資格情報を受け入れます:

```bash
npm run accept-credential
```

実行結果:
- AliceのウォレットがCredentialAcceptトランザクションを実行
- 発行者、資格情報タイプが指定され、正式にCredentialが有効化されます
- トランザクションハッシュが表示されます
- 資格情報が正式に有効化され、今後の送金で利用可能になります

### 4. 資格情報型承認設定 (credential-preauth.ts)

Verityアカウントで特定の資格情報を持つアカウントだけからの送金を受け付ける設定を行います:

```bash
npm run credential-preauth
```

実行結果:
- Verityアカウントで「DepositAuth」フラグが有効化されます
- 特定の資格情報タイプ（XRPLCommunityExamCertification）を持つアカウントからの送金のみを受け付ける設定が行われます
- AuthorizeCredentialsによる承認設定が行われます
- 現在の設定状況が表示されます

### 5. 資格情報による送金テスト (transfer-to-verity.ts)

資格情報を持つAliceと持たないBobからVerityへの送金テストを実行:

```bash
npm run transfer-to-verity
```

実行結果:
- Aliceから資格情報IDを含めた送金が実行され、成功します
- Bobからの通常送金は拒否されます（tecNO_PERMISSION）
- 各トランザクションの結果、トランザクションハッシュ、手数料などが表示されます
- 送金テスト結果のサマリーが表示されます

### 6. 資格情報の取り消し (revoke-credential.ts, オプション)

発行した資格情報を取り消します:

```bash
npm run revoke-credential
```

実行結果:
- 現在のCredential一覧が表示されます
- 取り消し対象の資格情報タイプと受信者が表示されます
- 確認プロンプトが表示され、`y`を入力すると取り消しが実行されます
- 取り消し後のCredential一覧が表示され、対象の資格情報が削除されたことが確認できます

## その他のコマンド

資格情報の詳細表示:
```bash
npm run view-credential
```

## 開発向けのコマンド

コードのフォーマット:
```bash
npm run format
```

リンターの実行:
```bash
npm run lint
```

## 注意事項

- このプロジェクトはDevnet環境向けの実装です
- Credentials機能は現在Devnetでのみ利用可能です（2025年4月現在）
- クレデンシャルの取り消しは発行者のみが実行できます
- 将来的に本番環境で使用する際は、適切なセキュリティ対策を講じてください

## 実装の詳細

- **資格情報ID (CredentialID)**: レジャーエントリのインデックス値で、送金時にCredentialIDsフィールドに含めることで資格情報の所有を証明します
- **DepositAuth**: 特定の条件を満たすアカウントからのみ送金を受け付ける機能
- **AuthorizeCredentials**: 特定の資格情報タイプを持つアカウントからの送金のみを許可する機能

## XRPLとDevnet環境について

- Devnetは開発者がXRPLの新機能を安全にテストするための環境です
- テスト用XRPはDevnetフォーセットから無料で入手できます
- トランザクションの詳細はDevnet Explorerで確認できます: https://devnet.xrpl.org

## トラブルシューティング

- 接続エラーが発生した場合は、Devnetのステータスを確認してください
- アカウント作成後もトランザクションが失敗する場合は、残高が十分かを確認してください
- トランザクションが失敗する場合は、シークレットキーが正しいことを確認してください 
- 送金が拒否される場合は、正しい資格情報IDを使用しているか確認してください
