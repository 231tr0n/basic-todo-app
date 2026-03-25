import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';

export class MessageChannelTransport implements Transport {
	private port: MessagePort;
	private started = false;
	private closed = false;

	sessionId: string;

	onmessage?: (message: JSONRPCMessage) => void;
	onerror?: (error: Error) => void;
	onclose?: () => void;
	setProtocolVersion?: (version: string) => void;

	constructor(port: MessagePort, sessionId?: string) {
		this.port = port;
		this.sessionId = sessionId ?? MessageChannelTransport.generateSessionId();

		this.port.onmessage = (event) => {
			try {
				const message = JSONRPCMessageSchema.parse(event.data);
				this.onmessage?.(message);
			} catch (error) {
				this.onerror?.(
					new Error(
						`Error parsing or executing onmessage callback in MessageChannelTransport of session id: ${this.sessionId} - ${JSON.stringify(error)}`
					)
				);
			}
		};

		this.port.onmessageerror = (event) => {
			this.onerror?.(
				new Error(
					`Error deserializing message in MessageChannelTransport of session id: ${this.sessionId} - ${JSON.stringify(event)}`
				)
			);
		};
	}

	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.started) {
				reject(
					new Error(
						`Cannot start a started MessageChannelTransport of session id: ${this.sessionId}`
					)
				);
			}
			if (this.closed) {
				reject(
					new Error(
						`Cannot start a closed MessageChannelTransport of session id: ${this.sessionId}`
					)
				);
			}
			this.started = true;
			this.port.start();
			resolve();
		});
	}

	async send(message: JSONRPCMessage): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.closed) {
				reject(
					new Error(
						`Cannot send messages on a closed MessageChannelTransport of session id: ${this.sessionId}`
					)
				);
			}
			try {
				this.port.postMessage(message);
				resolve();
			} catch (error) {
				const err = new Error(
					`Error in posting message on a MessageChannelTransport of session id: ${this.sessionId} - ${JSON.stringify(error)}`
				);
				this.onerror?.(err);
				reject(err);
			}
		});
	}

	async close(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.closed) {
				reject(
					new Error(
						`Cannot close a closed MessageChannelTransport of session id: ${this.sessionId}`
					)
				);
			}
			this.closed = true;
			this.port.close();
			this.onclose?.();
			resolve();
		});
	}

	private static generateSessionId(): string {
		return crypto.randomUUID();
	}

	static createChannelPair(): {
		clientChannel: MessageChannelTransport;
		serverChannel: MessageChannelTransport;
	} {
		const channel = new MessageChannel();
		const sessionId = MessageChannelTransport.generateSessionId();

		return {
			clientChannel: new MessageChannelTransport(channel.port1, sessionId),
			serverChannel: new MessageChannelTransport(channel.port2, sessionId)
		};
	}
}
