import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

const markdown = new Marked(
	markedHighlight({
		emptyLangClass: 'hljs',
		langPrefix: 'hljs language-',
		highlight(code, language) {
			const knownLanguage = hljs.getLanguage(language) ? language : 'plaintext';
			return hljs.highlight(code, { language: knownLanguage }).value;
		}
	})
);

export function renderMarkdown(source: string): string {
	return DOMPurify.sanitize(markdown.parse(source) as string);
}
