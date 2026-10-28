import { ChatCompletionMessageToolCallToMarkdownHtmlPipePipe } from './chat-completion-message-tool-call-to-markdown-html-pipe-pipe';

describe('ChatCompletionMessageToolCallToMarkdownHtmlPipePipe', () => {
	it('create an instance', () => {
		const pipe = new ChatCompletionMessageToolCallToMarkdownHtmlPipePipe();
		expect(pipe).toBeTruthy();
	});
});
