import type { Transaction } from "xrpl";

// 基本的なトランザクション型を定義
type BaseTransaction = Omit<Transaction, "TransactionType">;

export interface CredentialTransaction extends BaseTransaction {
  TransactionType: "CredentialCreate";
  Subject: string;
  CredentialType: string;
  Expiration?: number;
  URI?: string;
  Memos?: Array<{
    Memo: {
      MemoData: string;
      MemoType?: string;
      MemoFormat?: string;
    };
  }>;
}

export interface CredentialRevokeTransaction extends BaseTransaction {
  TransactionType: "CredentialDelete";
  CredentialType: string;
  Subject?: string;
  Issuer?: string;
}

export interface AccountCredentialsRequest {
  command: "account_credentials";
  account: string;
  subject?: string;
}

export interface CredentialEntry {
  Subject: string;
  CredentialType: string;
  Flags: number;
  Expiration?: number;
  URI?: string;
}

export interface AccountCredentialsResponse {
  result: {
    credentials: CredentialEntry[];
  };
}
