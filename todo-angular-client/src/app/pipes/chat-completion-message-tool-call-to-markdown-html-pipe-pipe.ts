import { Pipe, PipeTransform } from '@angular/core';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import type {
	ChatCompletionAssistantMessageParam,
	ChatCompletionMessageParam
} from 'openai/resources/chat/completions';

@Pipe({
	name: 'chatCompletionMessageToolCallToMarkdownHtmlPipe'
})
export class ChatCompletionMessageToolCallToMarkdownHtmlPipePipe implements PipeTransform {
	private readonly marked = new Marked(
		markedHighlight({
			emptyLangClass: 'hljs',
			langPrefix: 'hljs language-',
			highlight(code, lang) {
				const language = hljs.getLanguage(lang) ? lang : 'plaintext';
				return hljs.highlight(code, { language }).value;
			}
		})
	);

	transform(value: ChatCompletionMessageParam): string {
		const assistantMessage = value as ChatCompletionAssistantMessageParam;
		if (!assistantMessage.tool_calls) return '';

		let content = '';
		for (const toolCall of assistantMessage.tool_calls) {
			if (toolCall.type !== 'function') continue;
			content += `\`\`${toolCall.id} - ${toolCall.function.name}\`\``;
			content += `\n\`\`\`json\n`;
			try {
				content += JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2);
			} catch {
				content += toolCall.function.arguments;
			}
			content += `\n\`\`\`\n`;
		}
		return DOMPurify.sanitize(this.marked.parse(content) as string);
	}
}
