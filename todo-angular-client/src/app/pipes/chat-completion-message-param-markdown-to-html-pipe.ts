import { Pipe, PipeTransform } from '@angular/core';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

@Pipe({
	name: 'chatCompletionMessageParamMarkdownToHtml'
})
export class ChatCompletionMessageParamMarkdownToHtmlPipe implements PipeTransform {
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
		if (typeof value.content !== 'string') return '';
		return DOMPurify.sanitize(this.marked.parse(value.content) as string);
	}
}
