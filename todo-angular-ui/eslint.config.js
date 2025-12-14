// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import css from '@eslint/css';
import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig([
	{
		files: ['**/*.css'],
		plugins: { css },
		language: 'css/css',
		extends: [css.configs.recommended],
		rules: {
			'css/use-baseline': 'warn'
		}
	},
	{
		files: ['**/*.ts'],
		extends: [
			eslint.configs.recommended,
			tseslint.configs.eslintRecommended,
			tseslint.configs.strictTypeChecked,
			tseslint.configs.stylisticTypeChecked,
			angular.configs.tsAll,
			eslintConfigPrettier
		],
		languageOptions: {
			parserOptions: {
				projectService: true
			}
		},
		processor: angular.processInlineTemplates,
		rules: {
			'@angular-eslint/directive-selector': [
				'error',
				{
					type: 'attribute',
					prefix: 'app',
					style: 'camelCase'
				}
			],
			'@angular-eslint/component-selector': [
				'error',
				{
					type: 'element',
					prefix: 'app',
					style: 'kebab-case'
				}
			]
		}
	},
	{
		files: ['**/*.html'],
		extends: [angular.configs.templateAll],
		rules: {}
	}
]);
