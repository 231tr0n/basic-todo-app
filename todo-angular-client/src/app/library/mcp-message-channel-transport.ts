import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';

export class MessageChannelTransport implements Transport {
	private readonly port: MessagePort;
	readonly sessionId: string;
	private started = false;
	private closed = false;

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

	start(): Promise<void> {
		if (this.started) {
			return Promise.reject(
				new Error(`Cannot start a started MessageChannelTransport of session id: ${this.sessionId}`)
			);
		}
		if (this.closed) {
			return Promise.reject(
				new Error(`Cannot start a closed MessageChannelTransport of session id: ${this.sessionId}`)
			);
		}
		this.port.start();
		this.started = true;
		return Promise.resolve();
	}

	send(message: JSONRPCMessage): Promise<void> {
		if (this.closed) {
			return Promise.reject(
				new Error(
					`Cannot send messages on a closed MessageChannelTransport of session id: ${this.sessionId}`
				)
			);
		}
		try {
			this.port.postMessage(message);
		} catch (error) {
			const transportError = new Error(
				`Error in posting message on a MessageChannelTransport of session id: ${this.sessionId} - ${JSON.stringify(error)}`
			);
			this.onerror?.(transportError);
			return Promise.reject(transportError);
		}
		return Promise.resolve();
	}

	close(): Promise<void> {
		if (this.closed) return Promise.resolve();
		this.closed = true;
		this.port.onmessage = null;
		this.port.onmessageerror = null;
		this.port.close();
		this.onclose?.();
		delete this.onmessage;
		delete this.onerror;
		delete this.onclose;
		delete this.setProtocolVersion;
		return Promise.resolve();
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
