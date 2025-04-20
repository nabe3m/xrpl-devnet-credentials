export interface CredentialRequest {
  subject: string;
  credential: string;
  memo?: {
    data: string;
    type?: string;
    format?: string;
  };
  expiration?: string;
  uri?: string;
}

export interface CredentialResponse {
  subject: string;
  credential: string;
  accepted: boolean;
  expiration?: string;
  uri?: string;
  memo?: {
    data: string;
    type?: string;
    format?: string;
  };
}
