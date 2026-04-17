import { Pipe, PipeTransform } from '@angular/core';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

@Pipe({
	name: 'chatCompletionMessageParamMarkdownToHtml'
})
export class ChatCompletionMessageParamMarkdownToHtmlPipe implements PipeTransform {
	marked = new Marked(
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
		if (typeof value.content === 'string')
			return DOMPurify.sanitize(this.marked.parse(value.content) as string);
		return DOMPurify.sanitize(
			this.marked.parse(`\`\`\`json\nJSON.stringify(value, null, 2)\n\`\`\``) as string
		);
	}
}
