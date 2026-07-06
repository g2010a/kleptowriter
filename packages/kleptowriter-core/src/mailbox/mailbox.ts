import type { MailboxAddress, MailboxMessage, MailboxMessageType } from "./types.js";

type MailboxMessageInput = Omit<MailboxMessage, "id" | "timestamp">;

export class Mailbox {
  private readonly messages = new Map<string, MailboxMessage[]>();
  private readonly history = new Map<string, MailboxMessage>();
  private readonly agents = new Set<string>();

  deliver(to: MailboxAddress, message: MailboxMessageInput): MailboxMessage {
    const delivered: MailboxMessage = {
      ...message,
      to,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    const pending = this.messages.get(to.agentId) ?? [];
    pending.push(delivered);
    this.messages.set(to.agentId, pending);
    this.history.set(delivered.id, delivered);

    return delivered;
  }

  poll(agentId: string, sessionId?: string): MailboxMessage[] {
    const pending = this.messages.get(agentId) ?? [];
    const unread = pending.filter((message) => this.matchesSession(message, sessionId));
    const remaining = pending.filter((message) => !this.matchesSession(message, sessionId));

    if (remaining.length === 0) {
      this.messages.delete(agentId);
    } else {
      this.messages.set(agentId, remaining);
    }

    return unread;
  }

  peek(agentId: string, sessionId?: string): MailboxMessage[] {
    return (this.messages.get(agentId) ?? []).filter((message) =>
      this.matchesSession(message, sessionId),
    );
  }

  broadcast(from: string, type: MailboxMessageType, payload: unknown): MailboxMessage[] {
    return [...this.agents].map((agentId) =>
      this.deliver(
        { agentId },
        {
          type,
          from: { agentId: from },
          to: { agentId },
          payload,
        },
      ),
    );
  }

  getThread(messageId: string): MailboxMessage[] {
    const rootId = this.getThreadRootId(messageId);

    if (rootId === undefined) {
      return [];
    }

    return [...this.history.values()].filter(
      (message) => message.id === rootId || this.getThreadRootId(message.id) === rootId,
    );
  }

  registerAgent(agentId: string): void {
    this.agents.add(agentId);
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  private matchesSession(message: MailboxMessage, sessionId?: string): boolean {
    return message.to.sessionId === undefined || message.to.sessionId === sessionId;
  }

  private getThreadRootId(messageId: string): string | undefined {
    let message = this.history.get(messageId);

    if (message === undefined) {
      return undefined;
    }

    while (message.replyTo !== undefined) {
      const parent = this.history.get(message.replyTo);

      if (parent === undefined) {
        break;
      }

      message = parent;
    }

    return message.id;
  }
}
