import { Client, Wallet, SubmittableTransaction } from "xrpl";
import { CredentialRequest, CredentialResponse } from "../types/credential";
import {
	CredentialTransaction,
	CredentialRevokeTransaction,
} from "../types/xrpl-extensions";

export class CredentialService {
	private client: Client;
	private wallet: Wallet;

	constructor(client: Client, wallet: Wallet) {
		this.client = client;
		this.wallet = wallet;
	}

	// クレデンシャルの発行
	async issueCredential(request: CredentialRequest): Promise<string> {
		try {
			// トランザクションの準備
			const tx: CredentialTransaction = {
				TransactionType: "CredentialCreate",
				Account: this.wallet.address,
				Subject: request.subject,
				CredentialType: this.stringToHex(request.credential),
				...(request.expiration && {
					Expiration: this.dateToRippleTime(request.expiration),
				}),
				...(request.uri && { URI: this.stringToHex(request.uri) }),
			};

			// メモの追加（オプション）
			if (request.memo) {
				const memos = [
					{
						Memo: {
							MemoData: this.stringToHex(request.memo.data),
							...(request.memo.type && {
								MemoType: this.stringToHex(request.memo.type),
							}),
							...(request.memo.format && {
								MemoFormat: this.stringToHex(request.memo.format),
							}),
						},
					},
				];
				tx.Memos = memos;
			}

			// トランザクションの送信
			const prepared = await this.client.autofill(
				tx as unknown as SubmittableTransaction,
			);
			const signed = this.wallet.sign(prepared);
			const result = await this.client.submitAndWait(signed.tx_blob);

			if (typeof result.result.meta === "object" && result.result.meta) {
				// TransactionResultを安全に取得
				const txResult = (result.result.meta as any).TransactionResult;
				if (txResult === "tesSUCCESS") {
					return result.result.hash;
				} else {
					throw new Error(
						`クレデンシャルの発行に失敗しました: ${txResult || "不明なエラー"}`,
					);
				}
			} else {
				throw new Error("トランザクションの結果が不明です");
			}
		} catch (error) {
			console.error("クレデンシャル発行エラー:", error);
			throw error;
		}
	}

	// クレデンシャルの取得
	async getCredentials(subject?: string): Promise<CredentialResponse[]> {
		try {
			// account_credentials APIが利用できないため、
			// account_objects APIを使用してCredentialオブジェクトを取得
			const request = {
				command: "account_objects",
				account: this.wallet.address,
				type: "credential", // Credentialオブジェクトのみ取得
			};

			const response = await this.client.request(request as any);
			const result = response.result as any;

			if (!result.account_objects || !Array.isArray(result.account_objects)) {
				return [];
			}

			// 特定のsubjectに関連するCredentialのみをフィルタリング
			const credentials = subject
				? result.account_objects.filter((obj: any) => obj.Subject === subject)
				: result.account_objects;

			return credentials.map((cred: any) => {
				const response: CredentialResponse = {
					subject: cred.Subject,
					credential: this.hexToString(cred.CredentialType),
					accepted: (cred.Flags & 0x00010000) !== 0,
					...(cred.Expiration && {
						expiration: this.rippleTimeToDate(cred.Expiration),
					}),
					...(cred.URI && { uri: this.hexToString(cred.URI) }),
				};

				// メモ情報の取得
				if (cred.Memos && cred.Memos.length > 0 && cred.Memos[0].Memo) {
					const memo = cred.Memos[0].Memo;
					response.memo = {
						data: this.hexToString(memo.MemoData || ""),
						...(memo.MemoType && { type: this.hexToString(memo.MemoType) }),
						...(memo.MemoFormat && {
							format: this.hexToString(memo.MemoFormat),
						}),
					};
				}

				return response;
			});
		} catch (error) {
			console.error("クレデンシャル取得エラー:", error);
			throw error;
		}
	}

	// クレデンシャルの取り消し
	async revokeCredential(
		credentialType: string,
		subject?: string,
		issuer?: string,
	): Promise<string> {
		try {
			// 必須パラメータの検証
			if (!credentialType) {
				throw new Error("クレデンシャルタイプが指定されていません");
			}

			// 少なくともSubjectかIssuerのどちらかを指定
			if (!subject && !issuer) {
				// 対象のCredentialを特定
				console.log("取り消すCredentialの情報を検索中...");
				const credentials = await this.getCredentials();

				if (credentials.length > 0) {
					// 対象の証明書タイプに合致するCredentialを検索
					const matchedCredential = credentials.find(
						(cred) => cred.credential === credentialType,
					);

					if (matchedCredential) {
						subject = matchedCredential.subject;
						console.log(
							`対象のCredentialを発見しました: Type=${credentialType}, Subject=${subject}`,
						);
					} else {
						throw new Error(
							`指定された証明書タイプ ${credentialType} のCredentialが見つかりませんでした`,
						);
					}
				} else {
					throw new Error("取り消すCredentialが見つかりませんでした");
				}
			}

			// トランザクションの準備
			const tx: CredentialRevokeTransaction = {
				TransactionType: "CredentialDelete",
				Account: this.wallet.address,
				CredentialType: this.stringToHex(credentialType),
			};

			// Subject/Issuerの少なくともどちらかが必要
			if (subject) {
				tx.Subject = subject;
			} else if (issuer) {
				tx.Issuer = issuer;
			} else {
				throw new Error(
					"クレデンシャルの取り消しにはSubjectまたはIssuerのどちらかが必要です",
				);
			}

			console.log("送信するトランザクション:", JSON.stringify(tx, null, 2));

			const prepared = await this.client.autofill(
				tx as unknown as SubmittableTransaction,
			);
			const signed = this.wallet.sign(prepared);
			const result = await this.client.submitAndWait(signed.tx_blob);

			if (typeof result.result.meta === "object" && result.result.meta) {
				const txResult = (result.result.meta as any).TransactionResult;
				if (txResult === "tesSUCCESS") {
					return result.result.hash;
				} else {
					throw new Error(
						`クレデンシャルの取り消しに失敗しました: ${txResult || "不明なエラー"}`,
					);
				}
			} else {
				throw new Error("トランザクションの結果が不明です");
			}
		} catch (error) {
			console.error("クレデンシャル取り消しエラー:", error);
			throw error;
		}
	}

	// 文字列を16進数に変換
	private stringToHex(str: string): string {
		return Buffer.from(str).toString("hex").toUpperCase();
	}

	// 16進数を文字列に変換
	private hexToString(hex: string): string {
		return Buffer.from(hex, "hex").toString();
	}

	// 日付をRippleTimeに変換
	private dateToRippleTime(dateStr: string): number {
		const date = new Date(dateStr);
		return Math.floor(date.getTime() / 1000) - 946684800;
	}

	// RippleTimeを日付に変換
	private rippleTimeToDate(rippleTime: number): string {
		const date = new Date((rippleTime + 946684800) * 1000);
		return date.toISOString();
	}
}
