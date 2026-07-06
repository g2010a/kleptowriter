export type MailboxMessageType =
  | "evaluation"
  | "generation"
  | "state_update"
  | "query"
  | "response"
  | "broadcast";

export interface MailboxAddress {
  agentId: string;
  sessionId?: string;
}

export interface MailboxMessage {
  id: string;
  type: MailboxMessageType;
  from: MailboxAddress;
  to: MailboxAddress;
  payload: unknown;
  timestamp: Date;
  replyTo?: string;
}
