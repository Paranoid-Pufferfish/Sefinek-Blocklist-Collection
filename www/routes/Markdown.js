const express = require('express');
const router = express.Router();
const path = require('node:path');
const fs = require('node:fs/promises');
const { version } = require('../../package.json');

// Markdown
const Marked = require('marked');
Marked.use({ pedantic: false, gfm: true });

// Regex
const TITLE_REGEX = /\* Title\s+:\s+(.*)/;
const DESC_REGEX = /\* Description\s+:\s+(.*)/;
const TAGS_REGEX = /\* Tags\s+:\s+(.*)/;
const CANONICAL_REGEX = /\* Canonical\s+:\s+(.*)/;

// Functions
const convertUrls = link => {
	if ((/\/viewer\//).test(link)) link = link.replace(/%20/g, '_').replace('.md', '');
	return link;
};

const isValidName = name => (/^[a-zA-Z0-9_-]+$/).test(name);
const isPathSecure = file => !file.includes('..') && !file.includes('//') && !file.includes('\\');

const extractMatch = (regex, text) => {
	const match = text.match(regex);
	return match && match[1].trim() && match[1].trim() !== 'N/A' ? match[1].trim() : null;
};

const listFiles = async (dir) => {
	try {
		const files = await fs.readdir(dir);
		return files.map(file => ({
			name: file,
			path: path.join(dir, file)
		}));
	} catch (err) {
		console.error(err);
		return [];
	}
};

router.get('/markdown/lists', async (req, res) => {
	const files = await listFiles(path.join(__dirname, '..', '..', 'docs', 'lists'));
	res.render('explorer/markdown.ejs', { files });
});

router.get('/markdown/info', async (req, res) => {
	const files = await listFiles(path.join(__dirname, '..', '..', 'docs', 'info'));
	res.render('explorer/markdown.ejs', { files });
});

router.get('/markdown/tutorials', async (req, res) => {
	const files = await listFiles(path.join(__dirname, '..', '..', 'docs', 'tutorials'));
	res.render('explorer/markdown.ejs', { files });
});

// Viewer
const pages = [
	'Norton.txt',
	'What_is_Pi-hole',
	'What_is_Raspberry_Pi',
	'What_is_Regex',
	'Why_should_I_block_LoL',
	'Why_should_I_block_Riot_Games',
	'Why_should_I_block_Snapchat',
	'Why_should_I_block_TikTok',
	'Why_should_I_block_Valorant',
	'How_to_install_Pi-hole',
	'How_to_install_Unbound_for_Pi-hole'
];

router.use('/viewer/:category', async (req, res) => {
	const { category } = req.params;
	const file = req.url
		.replace(`/viewer/${category}`, '')
		.replace(/_/g, ' ')
		.replace(/\.md/, '')
		.replace(/%20/g, ' ');

	const fileName = req.url.split('/').pop();
	if (!isValidName(fileName) || !pages.includes(fileName)) return res.status(404).end();
	if (!isPathSecure(file)) return res.status(404).end();
	if (file.endsWith('.txt')) return res.redirect(`/docs/${category}/${file}`);

	try {
		const fullPath = path.join(__dirname, '..', '..', 'docs', category, `${file}.md`);
		if (!fullPath.startsWith(path.join(__dirname, '..', '..', 'docs', category))) return res.status(403).end();

		const stat = await fs.lstat(fullPath);
		if (!stat.isFile()) return res.status(404).end();

		const mdFile = await fs.readFile(fullPath, 'utf8');
		res.render('markdown-viewer.ejs', {
			html: Marked.parse(convertUrls(mdFile)),
			title: extractMatch(TITLE_REGEX, mdFile),
			desc: extractMatch(DESC_REGEX, mdFile),
			tags: extractMatch(TAGS_REGEX, mdFile),
			canonical: extractMatch(CANONICAL_REGEX, mdFile)
		});
	} catch (err) {
		console.error(err);
		res.status(500).end();
	}
});

module.exports = router;