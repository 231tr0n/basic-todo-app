import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { ChatCompletionMessageParamMarkdownToHtmlPipe } from './chat-completion-message-param-markdown-to-html-pipe';
import { ChatCompletionMessageToolCallToMarkdownHtmlPipe } from './chat-completion-message-tool-call-to-markdown-html-pipe';

describe('chat completion pipes', () => {
	const markdown = new ChatCompletionMessageParamMarkdownToHtmlPipe();
	const toolCalls = new ChatCompletionMessageToolCallToMarkdownHtmlPipe();

	it('renders sanitised markdown for string content', () => {
		const html = markdown.transform({ role: 'user', content: '**bold** <script>bad</script>' });

		expect(html).toContain('<strong>bold</strong>');
		expect(html).not.toContain('<script>');
	});

	it('returns an empty string for non-string content', () => {
		const message = {
			role: 'user',
			content: [{ type: 'text', text: 'Hello' }]
		} as ChatCompletionMessageParam;

		expect(markdown.transform(message)).toBe('');
	});

	it('highlights fenced code blocks', () => {
		const html = markdown.transform({
			role: 'assistant',
			content: '```ts\nconst value = 1;\n```'
		});

		expect(html).toContain('hljs language-ts');
		expect(html).toContain('hljs-keyword');
	});

	it('renders an empty string when there are no tool calls', () => {
		expect(toolCalls.transform({ role: 'assistant', content: 'Hello' })).toBe('');
	});

	it('renders function tool calls with formatted arguments', () => {
		const message = {
			role: 'assistant',
			content: null,
			tool_calls: [
				{
					id: 'call-1',
					type: 'function',
					function: { name: 'get_todos', arguments: '{"limit":5}' }
				}
			]
		} as ChatCompletionMessageParam;

		const html = toolCalls.transform(message);

		expect(html).toContain('call-1 - get_todos');
		expect(html).toContain('limit');
	});

	it('keeps invalid JSON and skips non-function tool calls', () => {
		const invalid = {
			role: 'assistant',
			content: null,
			tool_calls: [
				{
					id: 'call-2',
					type: 'function',
					function: { name: 'broken', arguments: 'not-json' }
				},
				{ id: 'call-3', type: 'custom', custom: { name: 'other' } }
			]
		} as ChatCompletionMessageParam;

		const html = toolCalls.transform(invalid);

		expect(html).toContain('not-json');
		expect(html).not.toContain('call-3');
	});
});
