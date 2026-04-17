import { ChatCompletionMessageParamMarkdownToHtmlPipe } from './chat-completion-message-param-markdown-to-html-pipe';

describe('MarkdownToHtmlPipe', () => {
	it('create an instance', () => {
		const pipe = new ChatCompletionMessageParamMarkdownToHtmlPipe();
		expect(pipe).toBeTruthy();
	});
});
